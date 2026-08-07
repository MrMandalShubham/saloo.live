// LooksOn Supplies catalog for shop owners (platform products) + their wallet balance.
import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const supabase = createAdminClient()

    const { data: products } = await supabase
      .from('store_products')
      .select('id, name, description, price, image_url, category, stock')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    // Buyer's shop wallet balance (for pay-from-wallet)
    let wallet_balance = 0
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (shop) {
      const { data: wallet } = await supabase.from('wallets').select('balance').eq('shop_id', shop.id).single()
      wallet_balance = Number(wallet?.balance ?? 0)
    }

    return json({ data: { products: products ?? [], wallet_balance }, error: null })
  } catch (err) {
    console.error('store-products-list error:', err)
    return error('Failed to load catalog', 500)
  }
})
