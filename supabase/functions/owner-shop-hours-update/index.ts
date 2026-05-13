import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  if (req.method !== 'POST') return error('Method not allowed', 405)

  try {
    const { hours, breaks } = await req.json()
    const supabase = createAdminClient()

    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!shop) return error('Shop not found', 404)

    // Replace all hours
    await supabase.from('shop_hours').delete().eq('shop_id', shop.id)
    if (hours?.length > 0) {
      const { error: insertErr } = await supabase.from('shop_hours').insert(
        hours.map((h: any) => ({ ...h, shop_id: shop.id }))
      )
      if (insertErr) throw insertErr
    }

    // Replace all breaks
    await supabase.from('shop_breaks').delete().eq('shop_id', shop.id)
    if (breaks?.length > 0) {
      const { error: breakErr } = await supabase.from('shop_breaks').insert(
        breaks.map((b: any) => ({ ...b, shop_id: shop.id }))
      )
      if (breakErr) throw breakErr
    }

    return json({ data: { success: true }, error: null })
  } catch (err) {
    console.error('owner-shop-hours-update error:', err)
    return error('Failed to update hours', 500)
  }
})
