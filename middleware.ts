import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareSupabaseClient, redirectWithCookies } from '@/lib/supabase/middleware'

const AUTH_ROUTES = ['/login', '/signup']
const OWNER_ONLY_ROUTES = ['/onboarding']
const PROTECTED_ROUTES = ['/dashboard', '/onboarding']

export async function middleware(request: NextRequest) {
  const { supabase, getResponse } = createMiddlewareSupabaseClient(request)
  const { pathname } = request.nextUrl

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute = AUTH_ROUTES.includes(pathname)
  const isOwnerOnlyRoute = OWNER_ONLY_ROUTES.includes(pathname)
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
  const isLandingRoute = pathname === '/'

  if (!user) {
    if (isProtectedRoute) {
      return redirectWithCookies(request, '/login', getResponse())
    }
    return getResponse()
  }

  // Authenticated from here on — figure out role + onboarding status so we
  // can keep owners/staff on the right side of the fence and never bounce
  // someone back to a page they just came from.
  if (isAuthRoute || isOwnerOnlyRoute || isProtectedRoute || isLandingRoute) {
    const { data: profile } = await supabase
      .from('users')
      .select('role, bakery_id')
      .eq('id', user.id)
      .maybeSingle()

    // No profile row yet (brand-new signup, race before first login finishes
    // provisioning it) — treat as an owner mid-onboarding rather than looping.
    const role = profile?.role ?? 'owner'

    if (role === 'staff') {
      if (isOwnerOnlyRoute || isAuthRoute) {
        return redirectWithCookies(request, '/dashboard', getResponse())
      }
      return getResponse()
    }

    let onboardingCompleted = false
    if (profile?.bakery_id) {
      const { data: bakery } = await supabase
        .from('bakeries')
        .select('onboarding_completed')
        .eq('id', profile.bakery_id)
        .maybeSingle()
      onboardingCompleted = Boolean(bakery?.onboarding_completed)
    }

    if (!onboardingCompleted) {
      if (pathname.startsWith('/dashboard') || isAuthRoute || isLandingRoute) {
        return redirectWithCookies(request, '/onboarding', getResponse())
      }
      return getResponse()
    }

    if (isOwnerOnlyRoute || isAuthRoute || isLandingRoute) {
      return redirectWithCookies(request, '/dashboard', getResponse())
    }
  }

  return getResponse()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
}
