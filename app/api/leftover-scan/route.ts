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

  const content: (ReturnType<typeof imageBlock> | { type: 'text'; text: string })[] = []
  let referenceNote = 'No reference photo was provided for this dish, so estimate from general judgement.'

  if (body.referencePhotoUrl) {
    const reference = await fetchReferenceImage(body.referencePhotoUrl)
    if (reference) {
      content.push({ type: 'text', text: 'Reference photo: this dish served as a full, freshly prepared tray.' })
      content.push(imageBlock(reference.mediaType, reference.base64))
      referenceNote = 'Compare the closing photo against the reference photo above to judge how much is left.'
    }
  }

  content.push({ type: 'text', text: `Closing photo of "${body.itemName}" at end of service. ${referenceNote}` })
  content.push(imageBlock(body.imageMediaType, body.imageBase64))
  content.push({
    type: 'text',
    text:
      `You are estimating how much of "${body.itemName}" remains, expressed in "${body.unit}" — the same unit used ` +
      `for how much was originally prepared. This means a serving-equivalent, not a literal count of physical plates ` +
      `visible in the photo (e.g. a loose tray of salad that looks about a third full of a "56 plate" batch is "~19 plates worth left", ` +
      `even though no individual plates are visible). Judge by the visible volume/coverage of food remaining compared to a full batch or full tray. ` +
      'Always give your best-effort numeric estimate, even if the photo is imperfect, lighting is poor, or you are uncertain — ' +
      'round to a sensible whole or half number. A member of staff will always review and correct this estimate before it is saved, ' +
      'so a rough guess is far more useful than refusing to answer. ' +
      'Respond with ONLY a JSON object, no other text, in this exact shape: {"quantity": <number>}. ' +
      'Only respond with {"quantity": null} if the image is completely unusable — e.g. solid black/corrupted, or clearly not a photo of food at all.',
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
    // Models sometimes wrap JSON in a markdown code fence despite instructions not to.
    const unfenced = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(unfenced) as { quantity: number | null }

    if (typeof parsed.quantity !== 'number' || !Number.isFinite(parsed.quantity) || parsed.quantity < 0) {
      return NextResponse.json({ error: 'AI could not estimate a quantity from this photo' }, { status: 422 })
    }

    return NextResponse.json({ quantity: parsed.quantity })
  } catch (err) {
    console.error('leftover-scan error:', err)
    return NextResponse.json({ error: 'AI photo scan failed' }, { status: 502 })
  }
}
