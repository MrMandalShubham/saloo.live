import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const supabase = createAdminClient()

    const { data: shop, error: shopErr } = await supabase
      .from('shops')
      .select(`
        *,
        hours:shop_hours(*),
        breaks:shop_breaks(*),
        barbers(*, hours:barber_hours(*)),
        services(*)
      `)
      .eq('owner_id', user.id)
      .single()

    if (shopErr || !shop) return error('Shop not found', 404)

    return json({ data: shop, error: null })
  } catch (err) {
    console.error('owner-shop-get error:', err)
    return error('Failed to fetch shop', 500)
  }
})
