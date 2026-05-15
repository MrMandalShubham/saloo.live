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
    const status = url.searchParams.get('status') // open | resolved_refund | resolved_no_refund | dismissed | all
    const page = parseInt(url.searchParams.get('page') ?? '1')
    const limit = parseInt(url.searchParams.get('limit') ?? '20')
    const offset = (page - 1) * limit

    let query = admin
      .from('disputes')
      .select(`
        id, reason, status, created_at, sla_deadline, admin_notes,
        booking:bookings(booking_ref, total_amount,
          customer:users!bookings_user_id_fkey(name, phone),
          shop:shops(name)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') query = query.eq('status', status)

    const { data, count, error } = await query
    if (error) throw error

    const flattened = (data ?? []).map((d: any) => ({
      id: d.id,
      reason: d.reason,
      status: d.status,
      created_at: d.created_at,
      sla_deadline: d.sla_deadline,
      admin_notes: d.admin_notes,
      booking_ref: d.booking?.booking_ref ?? '',
      amount_at_stake: d.booking?.total_amount ?? 0,
      customer_name: d.booking?.customer?.name ?? d.booking?.customer?.phone ?? '',
      shop_name: d.booking?.shop?.name ?? '',
    }))

    return new Response(JSON.stringify({ data: flattened, total: count }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: { message: e.message } }), { status: 500, headers: corsHeaders })
  }
})
