import { NextResponse } from 'next/server'

const API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000'

// GET — fallback, uses mock data inside Python engine
export async function GET() {
  try {
    const res = await fetch(`${API_URL}/api/savings-report`)
    if (!res.ok) throw new Error(`Flask returned ${res.status}`)
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: 'AI engine unavailable' }, { status: 503 })
  }
}

// POST — full report on real inputs
// body: { period?, reference_date?, avoidable_waste_rate?, accepted_menu_items?,
//         total_recommendations?, days_logged?, total_days_in_period?, reporting_rate? }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const res = await fetch(`${API_URL}/api/savings-report`, {
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
