import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient, getAuthUser } from '../_shared/supabase-admin.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { user, error: authErr } = await getAuthUser(req)
    if (!user) return new Response(JSON.stringify({ error: { message: authErr ?? 'Unauthorized' } }), { status: 401, headers: corsHeaders })

    const admin = createAdminClient()
    const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return new Response(JSON.stringify({ error: { message: 'Forbidden' } }), { status: 403, headers: corsHeaders })

    const url = new URL(req.url)
    const period = (url.searchParams.get('period') ?? '30d') as '7d' | '30d' | '90d'
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const since = new Date(Date.now() - days * 86400000).toISOString()

    const [payments, bookings, newUsers, newShops, completedBookings, bookingsByStatus] = await Promise.all([
      admin.from('payments').select('amount, created_at').gte('created_at', since).eq('status', 'captured'),
      admin.from('bookings').select('id, created_at, status').gte('created_at', since),
      admin.from('users').select('id', { count: 'exact', head: true }).gte('created_at', since),
      admin.from('shops').select('id', { count: 'exact', head: true }).gte('created_at', since),
      admin.from('bookings').select('id', { count: 'exact', head: true }).gte('created_at', since).eq('status', 'completed'),
      admin.from('bookings').select('status').gte('created_at', since),
    ])

    const totalRevenue = (payments.data ?? []).reduce((a: number, p: any) => a + (p.amount ?? 0), 0)
    const totalBookings = (bookings.data ?? []).length
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0
    const completionRate = totalBookings > 0 ? Math.round(((completedBookings.count ?? 0) / totalBookings) * 100) : 0

    // Revenue by day
    const revenueByDay: Record<string, { revenue: number; bookings: number }> = {}
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]!
      revenueByDay[d] = { revenue: 0, bookings: 0 }
    }
    for (const p of payments.data ?? []) {
      const d = p.created_at.split('T')[0]
      if (revenueByDay[d]) revenueByDay[d]!.revenue += p.amount ?? 0
    }
    for (const b of bookings.data ?? []) {
      const d = b.created_at.split('T')[0]
      if (revenueByDay[d]) revenueByDay[d]!.bookings += 1
    }

    // Bookings by status
    const statusCounts: Record<string, number> = {}
    for (const b of bookingsByStatus.data ?? []) {
      statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1
    }

    // Top cities - aggregate bookings and revenue per city
    const { data: shopData } = await admin.from('shops').select('city, id').eq('status', 'verified')
    const shopIdToCity: Record<string, string> = {}
    for (const s of shopData ?? []) {
      shopIdToCity[s.id] = s.city
    }
    const cityBookings: Record<string, { bookings: number; revenue: number }> = {}
    // Count bookings per city using bookings data from the period
    const { data: periodBookings } = await admin.from('bookings').select('shop_id, total_amount').gte('created_at', since)
    for (const b of periodBookings ?? []) {
      const city = shopIdToCity[b.shop_id]
      if (!city) continue
      if (!cityBookings[city]) cityBookings[city] = { bookings: 0, revenue: 0 }
      cityBookings[city]!.bookings += 1
      cityBookings[city]!.revenue += b.total_amount ?? 0
    }

    // Top shops - aggregate bookings and revenue per shop
    const { data: topShopsData } = await admin
      .from('shops')
      .select('id, name, rating')
      .eq('status', 'verified')
    const shopStats: Record<string, { name: string; bookings: number; revenue: number; rating: number }> = {}
    for (const s of topShopsData ?? []) {
      shopStats[s.id] = { name: s.name, bookings: 0, revenue: 0, rating: s.rating ?? 0 }
    }
    for (const b of periodBookings ?? []) {
      if (shopStats[b.shop_id]) {
        shopStats[b.shop_id]!.bookings += 1
        shopStats[b.shop_id]!.revenue += b.total_amount ?? 0
      }
    }

    return new Response(JSON.stringify({
      data: {
        period,
        total_revenue: totalRevenue,
        total_bookings: totalBookings,
        total_new_users: newUsers.count ?? 0,
        total_new_shops: newShops.count ?? 0,
        avg_booking_value: Math.round(avgBookingValue),
        platform_completion_rate: completionRate,
        revenue_by_day: Object.entries(revenueByDay)
          .map(([date, v]) => ({ date, ...v }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        bookings_by_status: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
        top_cities: Object.entries(cityBookings)
          .map(([city, v]) => ({ city, ...v }))
          .sort((a, b) => b.bookings - a.bookings)
          .slice(0, 5),
        top_shops: Object.values(shopStats)
          .sort((a, b) => b.bookings - a.bookings)
          .slice(0, 5),
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: { message: e.message } }), { status: 500, headers: corsHeaders })
  }
})
