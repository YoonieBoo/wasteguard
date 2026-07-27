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

const WEB_SAFE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

/**
 * iOS cameras often capture HEIC/HEIF by default, which Claude's vision API
 * (and most browsers other than Safari) can't read. Safari can still decode
 * it for canvas drawing even though it can't be uploaded directly, so
 * re-encode to JPEG here regardless of source format before it goes anywhere
 * — the AI call, the audit-trail upload, and the reference-photo upload all
 * need a web-safe format.
 */
export async function normalizeImageFile(file: File): Promise<File> {
  if (WEB_SAFE_TYPES.has(file.type)) {
    return file
  }

  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Unable to process photo')
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
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

  const data = await res.json()
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
