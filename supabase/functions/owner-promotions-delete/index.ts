import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  if (req.method !== 'DELETE' && req.method !== 'POST') return error('Method not allowed', 405)

  try {
    const url = new URL(req.url)
    const promoId = url.pathname.split('/').pop()
    if (!promoId) return error('Promotion ID required', 400)

    const supabase = createAdminClient()

    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!shop) return error('Shop not found', 404)

    const { error: dbErr } = await supabase
      .from('promotions')
      .delete()
      .eq('id', promoId)
      .eq('shop_id', shop.id)

    if (dbErr) throw dbErr

    return json({ data: { success: true }, error: null })
  } catch (err) {
    console.error('owner-promotions-delete error:', err)
    return error('Failed to delete promotion', 500)
  }
})
