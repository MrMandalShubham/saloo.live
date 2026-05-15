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

    if (!body.title || !body.type || body.discount_value === undefined || !body.valid_from) {
      return error('title, type, discount_value, valid_from required', 400)
    }

    const payload = {
      shop_id: shop.id,
      title: body.title,
      type: body.type,
      discount_value: body.discount_value,
      max_discount_amount: body.max_discount_amount ?? null,
      service_ids: body.service_ids ?? null,
      min_booking_amount: body.min_booking_amount ?? null,
      valid_from: body.valid_from,
      valid_to: body.valid_to ?? null,
      applicable_hours_start: body.applicable_hours_start ?? null,
      applicable_hours_end: body.applicable_hours_end ?? null,
      new_customers_only: body.new_customers_only ?? false,
      usage_limit: body.usage_limit ?? null,
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
