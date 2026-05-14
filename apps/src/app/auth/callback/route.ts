import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Ensure public.users row exists and get the role
      const { data: role } = await supabase.rpc('ensure_user_profile')

      const forwardedHost = request.headers.get('x-forwarded-host')
      const base = process.env.NODE_ENV === 'development'
        ? origin
        : forwardedHost ? `https://${forwardedHost}` : origin

      // Redirect to the correct dashboard based on role
      if (role === 'admin')      return NextResponse.redirect(`${base}/admin/dashboard`)
      // All users (including shop_owner) land on customer home first
      return NextResponse.redirect(`${base}/home`)
    }
  }

  // Code missing or exchange failed
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
