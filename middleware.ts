import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { routing } from '@/i18n/routing'
import type { UserRole } from '@/lib/types/database'

// Create the i18n middleware
const intlMiddleware = createMiddleware(routing)

export async function middleware(request: NextRequest) {
  // 1. Refresh Supabase session first
  const { supabaseResponse, user, supabase } = await updateSession(request)

  const { pathname } = request.nextUrl

  // 2. Extract locale from pathname (either 'ar' or 'en', default to 'ar')
  // With localePrefix: 'as-needed', Arabic paths have no prefix (e.g., /login, /doctor/dashboard)
  const localeMatch = pathname.match(/^\/(ar|en)(?:\/|$)/)
  const locale = localeMatch ? localeMatch[1] : 'ar'

  // 3. Check if accessing protected route (role-specific pages)
  // Match both prefixed (/en/doctor/...) and unprefixed (/doctor/...) for default locale
  const protectedRouteMatch = pathname.match(/^(?:\/(ar|en))?\/(patient|doctor|secretary)/)

  if (protectedRouteMatch && !user) {
    // User not authenticated, redirect to login
    const loginUrl = locale === 'ar'
      ? new URL('/login', request.url)
      : new URL(`/${locale}/login`, request.url)
    const response = NextResponse.redirect(loginUrl)

    // Merge Supabase cookies
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie)
    })

    return response
  }

  // 4. Check if authenticated user is accessing login page
  // Match both /login (Arabic default) and /en/login
  const loginPageMatch = pathname.match(/^(?:\/(ar|en))?\/login(?:\/|$)/)

  if (loginPageMatch && user) {
    // Query user's profile to get their role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile) {
      // Redirect to role-specific dashboard
      const dashboardPath = locale === 'ar'
        ? `/${profile.role}/dashboard`
        : `/${locale}/${profile.role}/dashboard`
      const dashboardUrl = new URL(dashboardPath, request.url)
      const response = NextResponse.redirect(dashboardUrl)

      // Merge Supabase cookies
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value, cookie)
      })

      return response
    }
  }

  // 5. Run next-intl middleware for locale routing
  const intlResponse = intlMiddleware(request)

  // 6. Merge Supabase cookies onto intl response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie)
  })

  return intlResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ]
}
