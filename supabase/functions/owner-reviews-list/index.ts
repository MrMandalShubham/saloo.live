import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const url = new URL(req.url)
    const page  = parseInt(url.searchParams.get('page') ?? '0')
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50)
    const filter = url.searchParams.get('filter') ?? 'all'  // all|pending_response|with_photos

    const supabase = createAdminClient()

    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!shop) return error('Shop not found', 404)

    let query = supabase
      .from('reviews')
      .select(`
        *,
        user:users(name, avatar_url),
        booking:bookings(booking_ref, barber:barbers(name))
      `)
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })
      .range(page * limit, page * limit + limit - 1)

    if (filter === 'pending_response') {
      query = query.is('shop_response', null)
    } else if (filter === 'with_photos') {
      query = query.not('photos', 'eq', '{}')
    }

    const { data, error: dbErr } = await query
    if (dbErr) throw dbErr

    const result = (data ?? []).map((r: any) => ({
      ...r,
      booking_ref: r.booking?.booking_ref ?? null,
      barber_name: r.booking?.barber?.name ?? null,
    }))

    return json({ data: result, error: null })
  } catch (err) {
    console.error('owner-reviews-list error:', err)
    return error('Failed to fetch reviews', 500)
  }
})
