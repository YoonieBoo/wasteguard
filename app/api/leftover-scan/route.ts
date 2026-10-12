import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// Vision-only estimation task, run per dish per hotel per closing — a fast/
// cheap model is the right fit here, not a reasoning-heavy one.
const MODEL = 'claude-haiku-4-5-20251001'

type ScanRequestBody = {
  imageBase64: string
  imageMediaType: string
  itemName: string
  unit: string
  referencePhotoUrl?: string | null
  preparedQuantity?: number | null
}

function imageBlock(mediaType: string, base64: string) {
  return {
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
      data: base64,
    },
  }
}

async function fetchReferenceImage(url: string): Promise<{ mediaType: string; base64: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const mediaType = res.headers.get('content-type') || 'image/jpeg'
    const buffer = await res.arrayBuffer()
    return { mediaType, base64: Buffer.from(buffer).toString('base64') }
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI photo scanning is not configured' }, { status: 503 })
  }

  let body: ScanRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.imageBase64 || !body.imageMediaType || !body.itemName || !body.unit) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const hasKnownTotal = typeof body.preparedQuantity === 'number' && Number.isFinite(body.preparedQuantity) && body.preparedQuantity > 0

  const content: (ReturnType<typeof imageBlock> | { type: 'text'; text: string })[] = []
  let referenceNote = 'No reference photo was provided for this dish, so estimate from general judgement.'
  let hasReferencePhoto = false

  if (body.referencePhotoUrl) {
    const reference = await fetchReferenceImage(body.referencePhotoUrl)
    if (reference) {
      hasReferencePhoto = true
      content.push({ type: 'text', text: 'Reference photo: this dish served as a full, freshly prepared tray.' })
      content.push(imageBlock(reference.mediaType, reference.base64))
      referenceNote = 'Compare the closing photo against the reference photo above to judge how much is left.'
    }
  }

  content.push({ type: 'text', text: `Closing photo of "${body.itemName}" at end of service. ${referenceNote}` })
  content.push(imageBlock(body.imageMediaType, body.imageBase64))

  // Grounding the estimate in the real prepared quantity (when known) turns
  // an open-ended "guess the whole batch size and the remainder from a
  // photo" task into a much better-constrained "estimate a % remaining, then
  // apply it to a real number" task — this is the main lever on accuracy,
  // more than lighting/angle, since otherwise the model has to also silently
  // guess how big a "full" batch looks like purely from the reference photo.
  const groundingNote = hasKnownTotal
    ? `This dish's batch today was prepared as exactly ${body.preparedQuantity} ${body.unit}. ` +
      (hasReferencePhoto
        ? 'First judge what percentage of the reference photo\'s full tray is still visually present in the closing photo, '
        : 'First judge what percentage of a full tray of this dish looks visually present in the closing photo, ') +
      `then multiply that percentage by ${body.preparedQuantity} to get your estimate — do not guess the total batch size independently, it is already known. `
    : ''

  content.push({
    type: 'text',
    text:
      `First check whether the closing photo plausibly shows "${body.itemName}" — a tray that's mostly or fully eaten, ` +
      'empty, dark, blurry, or hard to make out still counts as a match (treat it the same as any other low-confidence ' +
      `photo of "${body.itemName}"). Only treat it as a mismatch if you can clearly and specifically identify a ` +
      `DIFFERENT, NAMED dish in the photo (e.g. the photo obviously shows a salad when "${body.itemName}" is a soup, ` +
      'or a dessert when it\'s a main course) — a kitchen/catering tray swap mistake by whoever took the photo. ' +
      'If you cannot confidently name what specific different dish it is, it is NOT a mismatch — treat it as a normal, ' +
      `low-confidence photo of "${body.itemName}" instead. Never use placeholder values like "unknown", "empty", ` +
      '"unclear", or "n/a" for detected_dish — if you would have to write something like that, it means this is not ' +
      'a mismatch at all, so set dish_match to true and detected_dish to null instead. ' +
      `If it IS a genuine mismatch, set "dish_match" to false and "detected_dish" to the specific real dish name you can see, and set "quantity" to null. ` +
      `Otherwise set "dish_match" to true, "detected_dish" to null, and estimate how much of "${body.itemName}" remains, ` +
      `expressed in "${body.unit}" — the same unit used for how much was originally prepared. This means a serving-equivalent, ` +
      `not a literal count of physical plates visible in the photo (e.g. a loose tray of salad that looks about a third full ` +
      `of a "56 plate" batch is "~19 plates worth left", even though no individual plates are visible). Judge by the visible ` +
      'volume/coverage of food remaining compared to a full batch or full tray. ' +
      groundingNote +
      'When it is a match, always give your best-effort numeric estimate, even if the photo is imperfect, lighting is poor, ' +
      'or you are uncertain — round to a sensible whole or half number. A member of staff will always review and correct ' +
      'this estimate before it is saved, so a rough guess is far more useful than refusing to answer. ' +
      'Respond with ONLY a JSON object, no other text, in this exact shape: ' +
      '{"dish_match": <boolean>, "detected_dish": <string or null>, "quantity": <number or null>}. ' +
      'Only respond with quantity: null (with dish_match: true) if the image is completely unusable — e.g. solid black/corrupted, or clearly not a photo of food at all.',
  })

  try {
    const anthropic = new Anthropic({ apiKey })
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content }],
    })

    const textBlock = message.content.find((block) => block.type === 'text')
    const raw = textBlock && 'text' in textBlock ? textBlock.text.trim() : ''
    // Models sometimes wrap JSON in a markdown code fence, or add a trailing
    // sentence of commentary, despite instructions not to — the longer,
    // two-part prompt (dish-match check + quantity) makes this more likely
    // on ambiguous photos. Extract just the outermost {...} rather than
    // requiring the whole response to be strictly valid JSON on its own.
    const unfenced = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    const firstBrace = unfenced.indexOf('{')
    const lastBrace = unfenced.lastIndexOf('}')
    const jsonSlice = firstBrace !== -1 && lastBrace > firstBrace ? unfenced.slice(firstBrace, lastBrace + 1) : unfenced
    const parsed = JSON.parse(jsonSlice) as { dish_match?: boolean; detected_dish?: string | null; quantity: number | null }

    if (parsed.dish_match === false) {
      return NextResponse.json(
        { error: 'dish_mismatch', detectedDish: parsed.detected_dish || null },
        { status: 422 },
      )
    }

    if (typeof parsed.quantity !== 'number' || !Number.isFinite(parsed.quantity) || parsed.quantity < 0) {
      return NextResponse.json({ error: 'AI could not estimate a quantity from this photo' }, { status: 422 })
    }

    return NextResponse.json({ quantity: parsed.quantity })
  } catch (err) {
    console.error('leftover-scan error:', err)
    return NextResponse.json({ error: 'AI photo scan failed' }, { status: 502 })
  }
}
