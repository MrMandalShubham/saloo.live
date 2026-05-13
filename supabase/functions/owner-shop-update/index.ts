import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  if (req.method !== 'POST' && req.method !== 'PATCH') return error('Method not allowed', 405)

  try {
    const body = await req.json()
    const supabase = createAdminClient()

    // Verify ownership
    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!shop) return error('Shop not found', 404)

    const allowed = [
      'name', 'description', 'phone', 'address', 'city', 'state', 'pincode',
      'features', 'specialties', 'gst_number', 'social_instagram', 'social_facebook',
    ]
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }
    updates.updated_at = new Date().toISOString()

    const { data, error: updateErr } = await supabase
      .from('shops')
      .update(updates)
      .eq('id', shop.id)
      .select()
      .single()

    if (updateErr) throw updateErr

    return json({ data, error: null })
  } catch (err) {
    console.error('owner-shop-update error:', err)
    return error('Failed to update shop', 500)
  }
})
