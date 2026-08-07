import { handleCors, json, error } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const url = new URL(req.url)
    const shopId = url.searchParams.get('shop_id')
    if (!shopId) return error('shop_id required', 400)

    const supabase = createAdminClient()

    const { data: shop } = await supabase
      .from('shops').select('id, store_enabled').eq('id', shopId).single()
    if (!shop || !shop.store_enabled) {
      return json({ data: { store_enabled: false, products: [] }, error: null }, 200, 30)
    }

    const { data: products } = await supabase
      .from('store_products')
      .select('id, name, description, price, image_url, category, stock')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    return json({ data: { store_enabled: true, products: products ?? [] }, error: null }, 200, 30)
  } catch (err) {
    console.error('store-products-list error:', err)
    return error('Failed to load products', 500)
  }
})
