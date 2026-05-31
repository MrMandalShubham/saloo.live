import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')  // upcoming|past|cancelled|all
    const page = parseInt(url.searchParams.get('page') ?? '0')
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50)

    const supabase = createAdminClient()

    let query = supabase
      .from('bookings')
      .select(`
        id, booking_ref, date, start_time, end_time, status, total_amount, advance_amount, created_at, owner_completed, customer_completed,
        shop:shops(id, name, address, photos),
        barber:barbers(id, name, avatar_url)
      `)
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })
      .range(page * limit, page * limit + limit - 1)

    if (status === 'upcoming') {
      query = query.in('status', ['confirmed', 'in_chair'])
        .gte('date', new Date().toISOString().split('T')[0] ?? '')
    } else if (status === 'past') {
      query = query.in('status', ['completed', 'no_show'])
    } else if (status === 'cancelled') {
      query = query.in('status', ['cancelled', 'disputed', 'expired'])
    }

    const { data, error: dbErr } = await query
    if (dbErr) throw dbErr

    return json({ data, error: null })
  } catch (err) {
    console.error('bookings-list error:', err)
    return error('Failed to fetch bookings', 500)
  }
})
