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
