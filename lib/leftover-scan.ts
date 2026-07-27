import { supabase } from '@/lib/supabase'

/** Uploads a closing-time leftover photo and returns its public URL. */
export async function uploadLeftoverPhoto(
  businessId: string,
  itemKey: string,
  date: string,
  file: File,
): Promise<string> {
  const extension = file.name.split('.').pop() ?? 'jpg'
  const path = `${businessId}/${itemKey}-${date}-${Date.now()}.${extension}`

  const { error } = await supabase.storage.from('leftover-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (error) throw new Error(`Unable to upload photo: ${error.message}`)

  const { data } = supabase.storage.from('leftover-photos').getPublicUrl(path)
  return data.publicUrl
}

/** Uploads a one-time reference photo (a full tray) for a dish. */
export async function uploadReferencePhoto(businessId: string, menuItemId: string, file: File): Promise<string> {
  const extension = file.name.split('.').pop() ?? 'jpg'
  const path = `${businessId}/reference/${menuItemId}-${Date.now()}.${extension}`

  const { error } = await supabase.storage.from('leftover-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })
  if (error) throw new Error(`Unable to upload reference photo: ${error.message}`)

  const { data } = supabase.storage.from('leftover-photos').getPublicUrl(path)
  return data.publicUrl
}

// Claude's vision API downsamples images beyond this on the long edge anyway,
// so resizing to it client-side loses no estimation accuracy. It also keeps
// the base64 JSON payload well under Vercel's fixed 4.5MB request-body limit
// — a full-resolution phone/tablet camera photo (e.g. 4032x3024) can exceed
// that on its own once base64-encoded, which serverless platforms reject
// with a 413 before the request even reaches the API route.
const MAX_DIMENSION = 1568

/**
 * Re-encodes any camera photo to a size- and format-safe JPEG before it goes
 * anywhere — the AI call, the audit-trail upload, and the reference-photo
 * upload. This also covers HEIC/HEIF (iOS cameras' default capture format),
 * which Claude's vision API can't read but Safari can still decode for
 * canvas drawing even though it can't be uploaded directly.
 */
export async function normalizeImageFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Unable to process photo')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!blob) throw new Error('Unable to process photo')

  const jpegName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], jpegName, { type: 'image/jpeg' })
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // reader.result is "data:<mime>;base64,<data>" — strip the prefix.
      const result = reader.result as string
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read photo'))
    reader.readAsDataURL(file)
  })
}

export type LeftoverEstimateInput = {
  file: File
  itemName: string
  unit: string
  referencePhotoUrl?: string | null
}

/** Asks the AI to estimate leftover quantity from a photo. Throws on any failure. */
export async function requestLeftoverEstimate({
  file,
  itemName,
  unit,
  referencePhotoUrl,
}: LeftoverEstimateInput): Promise<number> {
  const imageBase64 = await fileToBase64(file)

  const res = await fetch('/api/leftover-scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      imageMediaType: file.type || 'image/jpeg',
      itemName,
      unit,
      referencePhotoUrl: referencePhotoUrl ?? null,
    }),
  })

  let data: { quantity?: number; error?: string }
  try {
    data = await res.json()
  } catch {
    throw new Error(res.status === 413 ? 'Photo is too large — try a smaller image' : 'AI photo scan failed')
  }
  if (!res.ok || typeof data.quantity !== 'number') {
    throw new Error(data.error || 'AI photo scan failed')
  }
  return data.quantity
}

export type SaveLeftoverScanInput = {
  businessId: string
  itemKey: string
  date: string
  photoUrl: string | null
  predictedQuantity: number | null
  unit: string
  confirmedQuantity: number
}

/** Upserts the audit record for a closing-time scan (prediction vs staff's confirmed value). */
export async function saveLeftoverScan({
  businessId,
  itemKey,
  date,
  photoUrl,
  predictedQuantity,
  unit,
  confirmedQuantity,
}: SaveLeftoverScanInput): Promise<void> {
  const { error } = await supabase.from('leftover_scans').upsert(
    {
      business_id: businessId,
      item_key: itemKey,
      date,
      photo_url: photoUrl,
      ai_predicted_quantity: predictedQuantity,
      ai_predicted_unit: unit,
      confirmed_quantity: confirmedQuantity,
    },
    { onConflict: 'business_id,item_key,date' },
  )
  if (error) throw new Error(`Unable to save leftover scan: ${error.message}`)
}
