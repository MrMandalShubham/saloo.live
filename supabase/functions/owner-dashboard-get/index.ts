import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const supabase = createAdminClient()

    // Get owner's shop
    const { data: shop } = await supabase
      .from('shops')
      .select('id, rating, review_count')
      .eq('owner_id', user.id)
      .single()

    if (!shop) return error('Shop not found', 404)

    const today = new Date().toISOString().split('T')[0]!
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!

    // Today's bookings
    const { data: todayBookings } = await supabase
      .from('bookings')
      .select(`
        id, booking_ref, start_time, end_time, status, total_amount,
        instructions, service_ids,
        user:users(name),
        barber:barbers(name)
      `)
      .eq('shop_id', shop.id)
      .eq('date', today)
      .not('status', 'in', '("cancelled","expired")')
      .order('start_time')

    const bookings = todayBookings ?? []

    // Get service names for each booking
    const allServiceIds = [...new Set(bookings.flatMap((b: any) => b.service_ids ?? []))]
    let serviceMap: Record<string, string> = {}
    if (allServiceIds.length > 0) {
      const { data: services } = await supabase
        .from('services')
        .select('id, name')
        .in('id', allServiceIds)
      serviceMap = Object.fromEntries((services ?? []).map((s: any) => [s.id, s.name]))
    }

    const upcoming_today = bookings.map((b: any) => ({
      id: b.id,
      booking_ref: b.booking_ref,
      start_time: b.start_time,
      end_time: b.end_time,
      status: b.status,
      customer_name: b.user?.name ?? 'Guest',
      service_names: (b.service_ids ?? []).map((id: string) => serviceMap[id] ?? id),
      barber_name: b.barber?.name ?? null,
    }))

    const today_revenue = bookings
      .filter((b: any) => b.status === 'completed')
      .reduce((sum: number, b: any) => sum + (b.total_amount ?? 0), 0)

    const pending_confirmations = bookings.filter((b: any) => b.status === 'pending_payment').length

    // Weekly revenue
    const { data: weeklyData } = await supabase
      .from('bookings')
      .select('total_amount')
      .eq('shop_id', shop.id)
      .eq('status', 'completed')
      .gte('date', weekAgo)

    const weekly_revenue = (weeklyData ?? []).reduce((sum: number, b: any) => sum + (b.total_amount ?? 0), 0)

    // Active disputes
    const { count: active_disputes } = await supabase
      .from('disputes')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shop.id)
      .in('status', ['open', 'under_review'])

    return json({
      data: {
        today_bookings: bookings.length,
        today_revenue,
        pending_confirmations,
        upcoming_today,
        weekly_revenue,
        total_reviews: shop.review_count,
        avg_rating: shop.rating,
        active_disputes: active_disputes ?? 0,
      },
      error: null,
    })
  } catch (err) {
    console.error('owner-dashboard-get error:', err)
    return error('Failed to fetch dashboard', 500)
  }
})
