import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient, getAuthUser } from '../_shared/supabase-admin.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const user = await getAuthUser(req)
    if (!user) return new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), { status: 401, headers: corsHeaders })

    const admin = createAdminClient()
    const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return new Response(JSON.stringify({ error: { message: 'Forbidden' } }), { status: 403, headers: corsHeaders })

    const today = new Date().toISOString().split('T')[0]!
    const monthStart = today.slice(0, 7) + '-01'

    const [shops, pendingShops, suspendedShops, users, newUsersToday, bookingsToday, revenueToday, revenueMtd, openDisputes, escalatedDisputes] = await Promise.all([
      admin.from('shops').select('id', { count: 'exact', head: true }),
      admin.from('shops').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      admin.from('shops').select('id', { count: 'exact', head: true }).eq('status', 'suspended'),
      admin.from('users').select('id', { count: 'exact', head: true }),
      admin.from('users').select('id', { count: 'exact', head: true }).gte('created_at', today),
      admin.from('bookings').select('id', { count: 'exact', head: true }).gte('created_at', today),
      admin.from('payments').select('amount').gte('created_at', today).eq('status', 'captured'),
      admin.from('payments').select('amount').gte('created_at', monthStart).eq('status', 'captured'),
      admin.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      admin.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'escalated'),
    ])

    const sumRevenue = (rows: any[]) => (rows ?? []).reduce((acc: number, r: any) => acc + (r.amount ?? 0), 0)
    const completedBookings = await admin.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'completed')
    const totalBookings = await admin.from('bookings').select('id', { count: 'exact', head: true }).not('status', 'eq', 'pending')
    const avgRating = await admin.from('shops').select('rating').eq('status', 'verified')
    const ratings = (avgRating.data ?? []).map((s: any) => s.rating).filter(Boolean)
    const platformAvgRating = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0

    return new Response(JSON.stringify({
      data: {
        total_shops: shops.count ?? 0,
        pending_approval: pendingShops.count ?? 0,
        suspended_shops: suspendedShops.count ?? 0,
        total_users: users.count ?? 0,
        new_users_today: newUsersToday.count ?? 0,
        bookings_today: bookingsToday.count ?? 0,
        revenue_today: sumRevenue(revenueToday.data ?? []),
        revenue_mtd: sumRevenue(revenueMtd.data ?? []),
        open_disputes: openDisputes.count ?? 0,
        escalated_disputes: escalatedDisputes.count ?? 0,
        platform_completion_rate: totalBookings.count ? Math.round(((completedBookings.count ?? 0) / totalBookings.count) * 100) : 0,
        platform_avg_rating: Math.round(platformAvgRating * 10) / 10,
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: { message: e.message } }), { status: 500, headers: corsHeaders })
  }
})
