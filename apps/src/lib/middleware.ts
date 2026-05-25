import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { jwtDecode } from 'jwt-decode'

// All route prefixes that require authentication
// Guest-accessible: /home, /search, /shop/*, /book/*
// Protected: everything else that needs auth
const PROTECTED_PREFIXES = [
  '/bookings',
  '/review', '/dispute', '/loyalty', '/notifications', '/profile',
  '/open-shop', '/owner', '/admin',
]

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

/**
 * Fast role extraction from the Supabase JWT's app_metadata.
 * Role is now only 'customer' or 'admin' — shop ownership is determined
 * by the shops table, not the role column.
 */
function getRoleFromJWT(request: NextRequest): string | null {
  const cookies = request.cookies.getAll()
  const authCookie = cookies.find(c => c.name.includes('auth-token'))
  if (!authCookie) return null

  try {
    let tokenValue = authCookie.value
    const chunks = cookies
      .filter(c => c.name.startsWith(authCookie.name.replace(/\.\d+$/, '')))
      .sort((a, b) => a.name.localeCompare(b.name))
    if (chunks.length > 1) {
      tokenValue = chunks.map(c => c.value).join('')
    }

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

  // 0. Developer Bypass
  if (request.cookies.get('saloo-dev-bypass')?.value === 'true') {
    return supabaseResponse
  }

  // 1. Unauthenticated → login
  if (!user && isProtected(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Logged-in on login page → /home
  if (user && (pathname === '/login' || pathname === '/admin/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  // 3. Access control
  const isOwnerRoute = pathname.startsWith('/owner')
  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login'

  if (user && (isOwnerRoute || isAdminRoute)) {
    const url = request.nextUrl.clone()

    // /admin/* → must be admin role
    if (isAdminRoute) {
      let role = getRoleFromJWT(request)
      if (!role) {
        const { data } = await supabase.rpc('get_user_role')
        role = data
      }
      if (role !== 'admin') {
        url.pathname = '/home'
        return NextResponse.redirect(url)
      }
    }

    // /owner/* → must have a shop in the shops table (any status) OR be admin
    if (isOwnerRoute) {
      let role = getRoleFromJWT(request)
      if (!role) {
        const { data } = await supabase.rpc('get_user_role')
        role = data
      }
      // Admins can always access owner routes
      if (role !== 'admin') {
        const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).limit(1).single()
        if (!shop) {
          url.pathname = '/open-shop'
          return NextResponse.redirect(url)
        }
      }
    }
  }

  return supabaseResponse
}
