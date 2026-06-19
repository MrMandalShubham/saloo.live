import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

const IST_DATE = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split('T')[0]

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { customer_name, customer_phone, service_ids, barber_id, estimated_duration_min } = await req.json()
    if (!customer_name || !customer_name.trim()) return error('Customer name required', 400)

    const supabase = createAdminClient()
    const today = IST_DATE()

    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    if (!shop) return error('Shop not found', 404)

    // Estimate duration
    let estimated = estimated_duration_min ?? 30
    if (Array.isArray(service_ids) && service_ids.length > 0) {
      const { data: svcs } = await supabase
        .from('services')
        .select('duration_min')
        .in('id', service_ids)
      const sum = (svcs ?? []).reduce((s: number, x: any) => s + (x.duration_min ?? 0), 0)
      if (sum > 0) estimated = sum
    }

    const { data: tokenResult, error: tokenErr } = await supabase
      .rpc('next_queue_token', { p_shop_id: shop.id, p_date: today })
    if (tokenErr) throw tokenErr
    const token = tokenResult as number

    const { data: entry, error: insErr } = await supabase
      .from('queue_entries')
      .insert({
        shop_id: shop.id,
        barber_id: barber_id ?? null,
        user_id: null,
        customer_name: customer_name.trim(),
        customer_phone: customer_phone ?? null,
        service_ids: Array.isArray(service_ids) ? service_ids : [],
        token_number: token,
        queue_date: today,
        estimated_duration_min: estimated,
        source: 'walk_in',
      })
      .select()
      .single()

    if (insErr) throw insErr

    return json({ data: { id: entry.id, token_number: token }, error: null })
  } catch (err) {
    console.error('owner-queue-add error:', err)
    return error('Failed to add walk-in', 500)
  }
})
