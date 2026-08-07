// A shop's supply purchase orders (from LooksOn).
import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const supabase = createAdminClient()
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return error('Shop not found', 404)

    const { data: orders } = await supabase
      .from('store_orders')
      .select('*, items:store_order_items(id, name, price, quantity)')
      .eq('shop_id', shop.id)
      .neq('status', 'pending_payment')
      .order('created_at', { ascending: false })
      .limit(60)

    return json({ data: { orders: orders ?? [] }, error: null })
  } catch (err) {
    console.error('owner-orders-list error:', err)
    return error('Failed to load orders', 500)
  }
})
