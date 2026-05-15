import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { jwtDecode } from 'jwt-decode'

// All route prefixes that require authentication
const PROTECTED_PREFIXES = [
  '/home', '/search', '/shop', '/book', '/bookings',
  '/review', '/dispute', '/loyalty', '/notifications', '/profile',
  '/open-shop', '/owner', '/admin',
]

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

/**
 * Fast role extraction from the Supabase JWT's app_metadata.
 * We store the user role in the JWT claims via a Postgres hook (see 0007 migration).
 * This avoids a DB round-trip on every request — critical for 1K+ concurrent users.
 * Falls back to RPC call if JWT doesn't contain the role (backward compat).
 */
function getRoleFromJWT(request: NextRequest): string | null {
  // Supabase stores the session in a cookie like sb-<ref>-auth-token
  const cookies = request.cookies.getAll()
  const authCookie = cookies.find(c => c.name.includes('auth-token'))
  if (!authCookie) return null

  try {
    // The cookie value might be base64 chunks; try to parse
    let tokenValue = authCookie.value
    // Handle chunked cookies (sb-xxx-auth-token.0, .1, etc.)
    const chunks = cookies
      .filter(c => c.name.startsWith(authCookie.name.replace(/\.\d+$/, '')))
      .sort((a, b) => a.name.localeCompare(b.name))
    if (chunks.length > 1) {
      tokenValue = chunks.map(c => c.value).join('')
    }

    // Parse the JSON array [access_token, refresh_token] or the raw JWT
    let accessToken: string
    try {
      const parsed = JSON.parse(decodeURIComponent(tokenValue))
      accessToken = Array.isArray(parsed) ? parsed[0] : parsed.access_token ?? tokenValue
    } catch {
      accessToken = tokenValue
    }

    const decoded = jwtDecode<{
      user_metadata?: { role?: string }
      app_metadata?: { user_role?: string }
    }>(accessToken)

    return decoded.app_metadata?.user_role ?? null
  } catch {
    return null
  }
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

  // 2. Logged-in users on login page → always go to /home
  const isLoginPage = pathname === '/login' || pathname === '/admin/login'
  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  // 3. Role-based access control for owner/admin routes
  const isOwnerRoute = pathname.startsWith('/owner')
  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login'

  if (user && (isOwnerRoute || isAdminRoute)) {
    let role = getRoleFromJWT(request)
    if (!role) {
      const { data } = await supabase.rpc('get_user_role')
      role = data
    }

    const url = request.nextUrl.clone()

    // Non-owner/Non-admin hitting /owner/* → Open a Shop page
    if (isOwnerRoute && role !== 'shop_owner' && role !== 'admin') {
      url.pathname = '/open-shop'
      return NextResponse.redirect(url)
    }

    // Non-admin hitting /admin/* → home
    if (isAdminRoute && role !== 'admin') {
      url.pathname = '/home'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
