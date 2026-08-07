import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const admin = createAdminClient()
    const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return error('Forbidden', 403)

    const url = new URL(req.url)
    const status = url.searchParams.get('status') // active|delivered|all

    let query = admin
      .from('store_orders')
      .select('*, items:store_order_items(id, name, price, quantity), shop:shops(name, phone, city)')
      .neq('status', 'pending_payment')
      .order('created_at', { ascending: false })
      .limit(80)

    if (status === 'active') query = query.in('status', ['paid', 'shipped'])
    else if (status === 'delivered') query = query.eq('status', 'delivered')

    const { data: orders } = await query

    // Simple revenue/margin summary over paid+ orders
    const { data: all } = await admin.from('store_orders').select('total_amount, status').neq('status', 'pending_payment')
    const revenue = (all ?? []).filter((o: any) => o.status !== 'cancelled' && o.status !== 'refunded').reduce((s: number, o: any) => s + Number(o.total_amount), 0)

    return json({ data: { orders: orders ?? [], revenue }, error: null })
  } catch (err) {
    console.error('admin-supply-orders-list error:', err)
    return error('Failed to load orders', 500)
  }
})
