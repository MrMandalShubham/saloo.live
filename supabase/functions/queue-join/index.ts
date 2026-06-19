import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'
import { sendPush } from '../_shared/fcm.ts'

const IST_DATE = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split('T')[0]

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { shop_id, barber_id, service_ids } = await req.json()
    if (!shop_id) return error('shop_id required', 400)

    const supabase = createAdminClient()
    const today = IST_DATE()

    // Shop must exist, be verified, and allow walk-ins
    const { data: shop } = await supabase
      .from('shops')
      .select('id, name, status, walk_in_enabled, owner_id')
      .eq('id', shop_id)
      .single()

    if (!shop) return error('Shop not found', 404)
    if (shop.status !== 'verified') return error('Shop is not active', 422)
    if (!shop.walk_in_enabled) return error('This shop is not accepting walk-ins right now', 422)

    // Prevent duplicate active entry for this user today
    const { data: existing } = await supabase
      .from('queue_entries')
      .select('id, status, token_number')
      .eq('shop_id', shop_id)
      .eq('user_id', user.id)
      .eq('queue_date', today)
      .in('status', ['waiting', 'called', 'in_chair'])
      .limit(1)
      .maybeSingle()

    if (existing) {
      return json({ data: { id: existing.id, token_number: existing.token_number, already_in_queue: true }, error: null })
    }

    // Estimate duration from selected services
    let estimated = 30
    if (Array.isArray(service_ids) && service_ids.length > 0) {
      const { data: svcs } = await supabase
        .from('services')
        .select('duration_min')
        .in('id', service_ids)
      const sum = (svcs ?? []).reduce((s: number, x: any) => s + (x.duration_min ?? 0), 0)
      if (sum > 0) estimated = sum
    }

    // Get this user's display name
    const { data: profile } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single()

    // Next token for shop+day
    const { data: tokenResult, error: tokenErr } = await supabase
      .rpc('next_queue_token', { p_shop_id: shop_id, p_date: today })
    if (tokenErr) throw tokenErr
    const token = tokenResult as number

    const { data: entry, error: insErr } = await supabase
      .from('queue_entries')
      .insert({
        shop_id,
        barber_id: barber_id ?? null,
        user_id: user.id,
        customer_name: profile?.name ?? 'Customer',
        service_ids: Array.isArray(service_ids) ? service_ids : [],
        token_number: token,
        queue_date: today,
        estimated_duration_min: estimated,
        source: 'online',
      })
      .select()
      .single()

    if (insErr) throw insErr

    // Notify owner of new walk-in
    if (shop.owner_id) {
      await supabase.from('notifications').insert({
        user_id: shop.owner_id,
        type: 'booking_pending',
        title: 'New Walk-in Joined Queue',
        body: `${profile?.name ?? 'A customer'} joined the queue · Token #${token}`,
        data: { queue_entry_id: entry.id, shop_id },
      }).catch(() => null)

      const { data: owner } = await supabase.from('users').select('fcm_token').eq('id', shop.owner_id).single()
      if (owner?.fcm_token) {
        sendPush({ fcmToken: owner.fcm_token, title: 'New Walk-in 🚶', body: `${profile?.name ?? 'Customer'} · Token #${token}` }).catch(() => null)
      }
    }

    return json({ data: { id: entry.id, token_number: token }, error: null })
  } catch (err) {
    console.error('queue-join error:', err)
    return error('Failed to join queue', 500)
  }
})
