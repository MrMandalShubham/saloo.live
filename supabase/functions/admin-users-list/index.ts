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
    const role = url.searchParams.get('role')  // customer | shop_owner | admin | all
    const search = url.searchParams.get('search') ?? ''
    const page = parseInt(url.searchParams.get('page') ?? '1')
    const limit = parseInt(url.searchParams.get('limit') ?? '20')
    const offset = (page - 1) * limit

    let query = admin
      .from('users')
      .select('id, phone, name, role, loyalty_tier, loyalty_points, no_show_count, is_suspended, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (role && role !== 'all') query = query.eq('role', role)
    if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)

    const { data, count, error } = await query
    if (error) throw error

    // Enrich with booking counts
    const userIds = (data ?? []).map((u: any) => u.id)
    const { data: bookingCounts } = await admin
      .from('bookings')
      .select('user_id')
      .in('user_id', userIds)

    const countByUser: Record<string, number> = {}
    for (const b of bookingCounts ?? []) {
      countByUser[b.user_id] = (countByUser[b.user_id] ?? 0) + 1
    }

    const enriched = (data ?? []).map((u: any) => ({
      ...u,
      total_bookings: countByUser[u.id] ?? 0,
    }))

    return new Response(JSON.stringify({ data: enriched, total: count }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: { message: e.message } }), { status: 500, headers: corsHeaders })
  }
})
