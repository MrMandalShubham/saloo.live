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

    const url = new URL(req.url)
    const status = url.searchParams.get('status') // pending | verified | suspended | all
    const search = url.searchParams.get('search') ?? ''
    const page = parseInt(url.searchParams.get('page') ?? '1')
    const limit = parseInt(url.searchParams.get('limit') ?? '20')
    const offset = (page - 1) * limit

    let query = admin
      .from('shops')
      .select(`
        id, name, city, status, rating, review_count, created_at,
        owner:users!shops_owner_id_fkey(full_name, phone)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') query = query.eq('status', status)
    if (search) query = query.ilike('name', `%${search}%`)

    const { data, count, error } = await query
    if (error) throw error

    // Enrich with booking + revenue counts
    const shopIds = (data ?? []).map((s: any) => s.id)
    const [bookingCounts, revenueTotals] = await Promise.all([
      admin.from('bookings').select('shop_id').in('shop_id', shopIds).eq('status', 'completed'),
      admin.from('payments').select('shop_id, amount').in('shop_id', shopIds).eq('status', 'captured'),
    ])

    const bookingsByShop: Record<string, number> = {}
    for (const b of bookingCounts.data ?? []) {
      bookingsByShop[b.shop_id] = (bookingsByShop[b.shop_id] ?? 0) + 1
    }
    const revenueByShop: Record<string, number> = {}
    for (const p of revenueTotals.data ?? []) {
      revenueByShop[p.shop_id] = (revenueByShop[p.shop_id] ?? 0) + (p.amount ?? 0)
    }

    const enriched = (data ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      city: s.city,
      status: s.status,
      rating: s.rating,
      review_count: s.review_count,
      created_at: s.created_at,
      owner_name: s.owner?.full_name ?? '',
      owner_phone: s.owner?.phone ?? '',
      total_bookings: bookingsByShop[s.id] ?? 0,
      total_revenue: revenueByShop[s.id] ?? 0,
    }))

    return new Response(JSON.stringify({ data: enriched, total: count }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: { message: e.message } }), { status: 500, headers: corsHeaders })
  }
})
