import { NextResponse } from 'next/server'

const API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000'

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/api/recommendations`, {
      next: { revalidate: 300 }, // cache 5 min server-side
    })
    if (!res.ok) throw new Error(`Flask returned ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'AI engine unavailable' }, { status: 503 })
  }
}
