import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status') // active|completed|all
    const supabase = createAdminClient()

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return error('Shop not found', 404)

    let query = supabase
      .from('store_orders')
      .select('*, items:store_order_items(id, name, price, quantity), user:users(name, phone)')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })
      .limit(60)

    if (status === 'active') query = query.in('status', ['paid', 'ready'])
    else if (status === 'completed') query = query.in('status', ['completed'])

    const { data: orders } = await query

    const counts = {
      active: (orders ?? []).filter((o: any) => ['paid', 'ready'].includes(o.status)).length,
    }

    return json({ data: { orders: orders ?? [], counts }, error: null })
  } catch (err) {
    console.error('owner-orders-list error:', err)
    return error('Failed to load orders', 500)
  }
})
