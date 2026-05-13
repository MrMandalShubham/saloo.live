import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// All route prefixes that require authentication
const PROTECTED_PREFIXES = [
  '/home', '/search', '/shop', '/book', '/bookings',
  '/review', '/dispute', '/loyalty', '/notifications', '/profile',
  '/open-shop', '/owner', '/admin',
]

// Routes only accessible to regular customers (Admins and Owners are redirected to their dashboards)
const CUSTOMER_ONLY_PREFIXES = [
  '/home', '/search', '/shop', '/book', '/bookings', '/loyalty', '/open-shop'
]

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

function isCustomerOnly(pathname: string) {
  return CUSTOMER_ONLY_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // 0. Developer Bypass (for testing UI without auth)
  const isDevBypass = request.cookies.get('saloo-dev-bypass')?.value === 'true'

  if (isDevBypass) {
    return supabaseResponse
  }

  // 1. Unauthenticated user hitting a protected route → login
  if (!user && isProtected(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Role-based redirection for logged-in users
  const isLoginPage = pathname === '/login' || pathname === '/admin/login'
  const isOwnerRoute = pathname.startsWith('/owner')
  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login'

  const needsRoleCheck = user && (isLoginPage || isOwnerRoute || isAdminRoute || isCustomerOnly(pathname))

  if (needsRoleCheck) {
    const { data: role } = await supabase.rpc('get_user_role')
    const url = request.nextUrl.clone()

    // Redirect logged-in users away from login page to their dashboards
    if (isLoginPage) {
      if (role === 'admin')      { url.pathname = '/admin/dashboard'; return NextResponse.redirect(url) }
      if (role === 'shop_owner') { url.pathname = '/owner/dashboard'; return NextResponse.redirect(url) }
      url.pathname = '/home';                                          return NextResponse.redirect(url)
    }

    // Force Admins and Shop Owners to their respective dashboards if they hit customer pages
    if (isCustomerOnly(pathname)) {
      if (role === 'admin')      { url.pathname = '/admin/dashboard'; return NextResponse.redirect(url) }
      if (role === 'shop_owner') { url.pathname = '/owner/dashboard'; return NextResponse.redirect(url) }
      // Customers stay on customer pages
    }

    // Non-owner/Non-admin hitting /owner/* → Open a Shop page (or their dashboard)
    if (isOwnerRoute && role !== 'shop_owner' && role !== 'admin') {
      url.pathname = '/open-shop'
      return NextResponse.redirect(url)
    }

    // Non-admin hitting /admin/* → home (or their dashboard)
    if (isAdminRoute && role !== 'admin') {
      if (role === 'shop_owner') { url.pathname = '/owner/dashboard'; return NextResponse.redirect(url) }
      url.pathname = '/home';                                          return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
