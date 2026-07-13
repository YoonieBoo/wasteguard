import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Supabase redirects here after an email-confirmation link is clicked.
// We exchange the code for a session just to confirm it's valid, then sign
// back out so the product flow stays "verify -> login" instead of silently
// auto-logging the visitor in on whatever device opened the email.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?verified=1`)
    }
  }

  return NextResponse.redirect(`${origin}/login?verified=0`)
}
