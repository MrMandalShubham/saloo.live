import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const supabase = createAdminClient()
    const { data: orders } = await supabase
      .from('store_orders')
      .select('*, items:store_order_items(id, name, price, quantity), shop:shops(id, name, address, phone)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(40)

    return json({ data: orders ?? [], error: null })
  } catch (err) {
    console.error('customer-orders-list error:', err)
    return error('Failed to load orders', 500)
  }
})
