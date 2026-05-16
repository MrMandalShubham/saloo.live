import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  if (req.method !== 'DELETE' && req.method !== 'POST') return error('Method not allowed', 405)

  try {
    // Accept service_id from body or URL path
    let serviceId: string | undefined
    try { const body = await req.json(); serviceId = body.service_id } catch {}
    if (!serviceId) {
      const url = new URL(req.url)
      serviceId = url.pathname.split('/').pop()
    }
    if (!serviceId) return error('Service ID required', 400)

    const supabase = createAdminClient()

    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!shop) return error('Shop not found', 404)

    // Soft-delete: mark inactive
    const { error: dbErr } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', serviceId)
      .eq('shop_id', shop.id)

    if (dbErr) throw dbErr

    return json({ data: { success: true }, error: null })
  } catch (err) {
    console.error('owner-services-delete error:', err)
    return error('Failed to delete service', 500)
  }
})
