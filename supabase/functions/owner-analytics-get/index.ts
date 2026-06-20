import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const url = new URL(req.url)
    const period = (url.searchParams.get('period') ?? '30d') as '7d' | '30d' | '90d'
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!

    const supabase = createAdminClient()

    const { data: shop } = await supabase
      .from('shops')
      .select('id, rating')
      .eq('owner_id', user.id)
      .single()

    if (!shop) return error('Shop not found', 404)

    // All bookings in period
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, status, total_amount, tip_amount, service_ids, user_id, date, barber_id, created_at')
      .eq('shop_id', shop.id)
      .gte('date', fromDate)

    const all = bookings ?? []
    const completed = all.filter((b: any) => b.status === 'completed')
    const cancelled = all.filter((b: any) => ['cancelled', 'expired'].includes(b.status))
    const noShows   = all.filter((b: any) => b.status === 'no_show')

    const total_revenue = completed.reduce((s: number, b: any) => s + (b.total_amount ?? 0), 0)
    const total_tips = completed.reduce((s: number, b: any) => s + (Number(b.tip_amount) || 0), 0)
    const total_bookings = all.length

    // Revenue by day
    const revenueByDay: Record<string, { revenue: number; bookings: number }> = {}
    for (const b of completed) {
      const d = b.date
      if (!revenueByDay[d]) revenueByDay[d] = { revenue: 0, bookings: 0 }
      revenueByDay[d]!.revenue += b.total_amount ?? 0
      revenueByDay[d]!.bookings += 1
    }
    const revenue_by_day = Object.entries(revenueByDay)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Top services
    const allServiceIds = completed.flatMap((b: any) => b.service_ids ?? [])
    const serviceCount: Record<string, number> = {}
    for (const id of allServiceIds) {
      serviceCount[id] = (serviceCount[id] ?? 0) + 1
    }
    const topServiceIds = Object.entries(serviceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id)

    let top_services: Array<{ name: string; count: number; revenue: number }> = []
    if (topServiceIds.length > 0) {
      const { data: services } = await supabase
        .from('services')
        .select('id, name, price')
        .in('id', topServiceIds)
      top_services = (services ?? []).map((s: any) => ({
        name: s.name,
        count: serviceCount[s.id] ?? 0,
        revenue: (serviceCount[s.id] ?? 0) * s.price,
      }))
    }

    // Top barbers
    const barberCount: Record<string, number> = {}
    for (const b of completed) {
      if (b.barber_id) barberCount[b.barber_id] = (barberCount[b.barber_id] ?? 0) + 1
    }
    const topBarberIds = Object.entries(barberCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id)

    // Tips by barber
    const barberTips: Record<string, number> = {}
    for (const b of completed) {
      if (b.barber_id) barberTips[b.barber_id] = (barberTips[b.barber_id] ?? 0) + (Number(b.tip_amount) || 0)
    }

    let top_barbers: Array<{ name: string; bookings: number; rating: number; tips: number }> = []
    if (topBarberIds.length > 0) {
      const { data: barbers } = await supabase
        .from('barbers')
        .select('id, name, rating')
        .in('id', topBarberIds)
      top_barbers = (barbers ?? []).map((b: any) => ({
        name: b.name,
        bookings: barberCount[b.id] ?? 0,
        rating: b.rating ?? 0,
        tips: barberTips[b.id] ?? 0,
      }))
    }

    // New vs repeat customers
    const customerIds = [...new Set(completed.map((b: any) => b.user_id))]
    let new_customers = 0, repeat_customers = 0
    for (const uid of customerIds) {
      const bookingCount = completed.filter((b: any) => b.user_id === uid).length
      if (bookingCount === 1) new_customers++
      else repeat_customers++
    }

    return json({
      data: {
        period,
        total_bookings,
        total_revenue,
        total_tips,
        avg_booking_value: completed.length > 0 ? Math.round(total_revenue / completed.length) : 0,
        completion_rate: total_bookings > 0 ? Math.round((completed.length / total_bookings) * 100) : 0,
        cancellation_rate: total_bookings > 0 ? Math.round((cancelled.length / total_bookings) * 100) : 0,
        no_show_rate: total_bookings > 0 ? Math.round((noShows.length / total_bookings) * 100) : 0,
        avg_rating: shop.rating ?? 0,
        new_customers,
        repeat_customers,
        top_services,
        top_barbers,
        revenue_by_day,
      },
      error: null,
    })
  } catch (err) {
    console.error('owner-analytics-get error:', err)
    return error('Failed to fetch analytics', 500)
  }
})
