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

    if (!body.title || !body.type || body.discount_value === undefined || !body.valid_from || !body.valid_until) {
      return error('title, type, discount_value, valid_from, valid_until required', 400)
    }

    const payload = {
      shop_id: shop.id,
      title: body.title,
      type: body.type,
      discount_value: body.discount_value,
      min_order_amount: body.min_order_amount ?? null,
      valid_from: body.valid_from,
      valid_until: body.valid_until,
      applicable_days: body.applicable_days ?? null,
      start_time: body.start_time ?? null,
      end_time: body.end_time ?? null,
      is_active: body.is_active ?? true,
    }

    let data, dbErr
    if (body.id) {
      const result = await supabase
        .from('promotions')
        .update(payload)
        .eq('id', body.id)
        .eq('shop_id', shop.id)
        .select()
        .single()
      data = result.data; dbErr = result.error
    } else {
      const result = await supabase
        .from('promotions')
        .insert(payload)
        .select()
        .single()
      data = result.data; dbErr = result.error
    }

    if (dbErr) throw dbErr

    return json({ data, error: null })
  } catch (err) {
    console.error('owner-promotions-upsert error:', err)
    return error('Failed to save promotion', 500)
  }
})
