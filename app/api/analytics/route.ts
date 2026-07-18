import { NextResponse } from 'next/server'

const API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000'

// GET — fallback, uses mock data inside Python engine
export async function GET() {
  try {
    const res = await fetch(`${API_URL}/api/analytics`)
    if (!res.ok) throw new Error(`Flask returned ${res.status}`)
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: 'AI engine unavailable' }, { status: 503 })
  }
}

// POST — full analytics report on real company data
// body: { daily_inputs: FoodRow[] }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const res = await fetch(`${API_URL}/api/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Flask returned ${res.status}`)
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: 'AI engine unavailable' }, { status: 503 })
  }
}
