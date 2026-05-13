import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')   // today|upcoming|past|all
    const date   = url.searchParams.get('date')     // YYYY-MM-DD (optional override)
    const page   = parseInt(url.searchParams.get('page') ?? '0')
    const limit  = Math.min(parseInt(url.searchParams.get('limit') ?? '30'), 50)

    const supabase = createAdminClient()

    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!shop) return error('Shop not found', 404)

    const today = new Date().toISOString().split('T')[0]!

    let query = supabase
      .from('bookings')
      .select(`
        id, booking_ref, date, start_time, end_time, status,
        total_amount, advance_amount, instructions, service_ids, created_at,
        user:users(name, phone, avatar_url),
        barber:barbers(id, name, avatar_url)
      `)
      .eq('shop_id', shop.id)
      .order('date', { ascending: status === 'upcoming' })
      .order('start_time', { ascending: true })
      .range(page * limit, page * limit + limit - 1)

    if (date) {
      query = query.eq('date', date)
    } else if (status === 'today') {
      query = query.eq('date', today)
        .not('status', 'in', '("cancelled","expired")')
    } else if (status === 'upcoming') {
      query = query.gte('date', today)
        .in('status', ['pending', 'confirmed', 'in_chair'])
    } else if (status === 'past') {
      query = query.lt('date', today)
        .in('status', ['completed', 'no_show', 'cancelled'])
    } else if (status === 'pending') {
      query = query.eq('status', 'pending')
    }

    const { data: bookings, error: dbErr } = await query
    if (dbErr) throw dbErr

    // Enrich with service names and dispute flag
    const allServiceIds = [...new Set((bookings ?? []).flatMap((b: any) => b.service_ids ?? []))]
    let serviceMap: Record<string, string> = {}
    if (allServiceIds.length > 0) {
      const { data: services } = await supabase
        .from('services')
        .select('id, name')
        .in('id', allServiceIds)
      serviceMap = Object.fromEntries((services ?? []).map((s: any) => [s.id, s.name]))
    }

    const bookingIds = (bookings ?? []).map((b: any) => b.id)
    let disputeSet = new Set<string>()
    if (bookingIds.length > 0) {
      const { data: disputes } = await supabase
        .from('disputes')
        .select('booking_id')
        .in('booking_id', bookingIds)
        .in('status', ['open', 'under_review'])
      disputeSet = new Set((disputes ?? []).map((d: any) => d.booking_id))
    }

    const result = (bookings ?? []).map((b: any) => ({
      id: b.id,
      booking_ref: b.booking_ref,
      date: b.date,
      start_time: b.start_time,
      end_time: b.end_time,
      status: b.status,
      total_amount: b.total_amount,
      advance_amount: b.advance_amount,
      instructions: b.instructions,
      customer: b.user,
      barber: b.barber,
      service_names: (b.service_ids ?? []).map((id: string) => serviceMap[id] ?? id),
      has_dispute: disputeSet.has(b.id),
    }))

    return json({ data: result, error: null })
  } catch (err) {
    console.error('owner-bookings-list error:', err)
    return error('Failed to fetch bookings', 500)
  }
})
