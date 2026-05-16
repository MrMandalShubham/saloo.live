import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  if (req.method !== 'POST') return error('Method not allowed', 405)

  try {
    const body = await req.json()
    const supabase = createAdminClient()

    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!shop) return error('Shop not found', 404)

    if (!body.name || !body.category || !body.duration_min || body.price === undefined) {
      return error('name, category, duration_min, price are required', 400)
    }

    const payload: Record<string, unknown> = {
      shop_id: shop.id,
      name: body.name,
      category: body.category,
      duration_min: body.duration_min,
      price: body.price,
      description: body.description ?? null,
      is_addon: body.is_addon ?? false,
      is_active: body.is_active ?? true,
    }
    if (body.image_url !== undefined) payload.image_url = body.image_url || null

    let data, dbErr
    if (body.id) {
      // Update — verify it belongs to this shop
      const result = await supabase
        .from('services')
        .update(payload)
        .eq('id', body.id)
        .eq('shop_id', shop.id)
        .select()
        .single()
      data = result.data; dbErr = result.error
    } else {
      const result = await supabase
        .from('services')
        .insert(payload)
        .select()
        .single()
      data = result.data; dbErr = result.error
    }

    if (dbErr) throw dbErr

    return json({ data, error: null })
  } catch (err) {
    console.error('owner-services-upsert error:', err)
    return error('Failed to save service', 500)
  }
})
