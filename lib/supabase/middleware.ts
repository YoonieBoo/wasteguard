import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Standard @supabase/ssr middleware pattern: reads the session from request
// cookies and mirrors any refreshed cookies onto the response we hand back.
export function createMiddlewareSupabaseClient(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  return { supabase, getResponse: () => response }
}

// Copies the refreshed auth cookies onto a redirect response so a redirect
// doesn't drop a session that was just refreshed during this request.
export function redirectWithCookies(request: NextRequest, to: string, source: NextResponse) {
  const redirectResponse = NextResponse.redirect(new URL(to, request.url))
  source.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
  return redirectResponse
}
