import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Supabase redirects here after an email-confirmation OR password-recovery
// link is clicked — both send a `code` to exchange for a session, and
// recovery links additionally carry `type=recovery`.
//
// For email confirmation: we exchange the code just to confirm it's valid,
// then sign back out so the product flow stays "verify -> login" instead of
// silently auto-logging the visitor in on whatever device opened the email.
//
// For password recovery: signing out immediately would leave the visitor
// with no way to actually set a new password, so we keep the session alive
// and send them to /reset-password instead.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?verified=1`)
    }
  }

  return NextResponse.redirect(`${origin}/login?verified=0`)
}
