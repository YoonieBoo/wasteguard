import { NextResponse } from 'next/server'

const API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const res = await fetch(`${API_URL}/api/confirm-preparation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'AI engine unavailable' }, { status: 503 })
  }
}
