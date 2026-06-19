import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'
import { sendPush } from '../_shared/fcm.ts'

// Allowed entry transitions
const ENTRY_TRANSITIONS: Record<string, string[]> = {
  waiting:  ['called', 'in_chair', 'no_show', 'cancelled'],
  called:   ['in_chair', 'no_show', 'cancelled', 'waiting'],
  in_chair: ['completed', 'no_show'],
}

const CHAIR_STATUSES = ['available', 'cutting', 'cleanup', 'break', 'offline']

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const body = await req.json()
    const { action } = body
    const supabase = createAdminClient()

    const { data: shop } = await supabase
      .from('shops')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()
    if (!shop) return error('Shop not found', 404)

    // ── Toggle walk-in acceptance ──
    if (action === 'toggle_walk_in') {
      const { error: upErr } = await supabase
        .from('shops')
        .update({ walk_in_enabled: !!body.enabled })
        .eq('id', shop.id)
      if (upErr) throw upErr
      return json({ data: { walk_in_enabled: !!body.enabled }, error: null })
    }

    // ── Set a barber's chair status ──
    if (action === 'chair_status') {
      const { barber_id, chair_status } = body
      if (!barber_id || !CHAIR_STATUSES.includes(chair_status)) return error('Invalid chair status', 400)
      const { error: upErr } = await supabase
        .from('barbers')
        .update({ chair_status })
        .eq('id', barber_id)
        .eq('shop_id', shop.id)
      if (upErr) throw upErr
      return json({ data: { barber_id, chair_status }, error: null })
    }

    // ── Entry transitions ──
    const { entry_id, status, barber_id } = body
    if (!entry_id || !status) return error('entry_id and status required', 400)

    const { data: entry } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('id', entry_id)
      .eq('shop_id', shop.id)
      .single()
    if (!entry) return error('Queue entry not found', 404)

    const allowed = ENTRY_TRANSITIONS[entry.status] ?? []
    if (!allowed.includes(status)) {
      return error(`Cannot move from ${entry.status} to ${status}`, 422)
    }

    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    const now = new Date().toISOString()

    if (status === 'called') updates.called_at = now
    if (status === 'in_chair') {
      updates.started_at = now
      if (barber_id) updates.assigned_barber_id = barber_id
    }
    if (status === 'completed') updates.completed_at = now

    const { data: updated, error: updErr } = await supabase
      .from('queue_entries')
      .update(updates)
      .eq('id', entry_id)
      .select()
      .single()
    if (updErr) throw updErr

    // Auto-update chair status of the assigned barber
    const targetBarber = barber_id ?? entry.assigned_barber_id
    if (targetBarber) {
      let chair: string | null = null
      if (status === 'in_chair') chair = 'cutting'
      else if (status === 'completed' || status === 'no_show') chair = 'cleanup'
      if (chair) {
        await supabase.from('barbers').update({ chair_status: chair }).eq('id', targetBarber).eq('shop_id', shop.id).catch(() => null)
      }
    }

    // ── Notify customer on turn / start ──
    if (entry.user_id && ['called', 'in_chair'].includes(status)) {
      const notif = status === 'called'
        ? { title: "It's Your Turn! 🎉", body: `Token #${entry.token_number} — please head to ${shop.name} now.` }
        : { title: 'You\'re in the chair 💈', body: `Enjoy your service at ${shop.name}!` }

      await supabase.from('notifications').insert({
        user_id: entry.user_id,
        type: 'booking_confirmed',
        title: notif.title,
        body: notif.body,
        data: { queue_entry_id: entry.id, shop_id: shop.id },
      }).catch(() => null)

      const { data: customer } = await supabase.from('users').select('fcm_token').eq('id', entry.user_id).single()
      if (customer?.fcm_token) {
        sendPush({ fcmToken: customer.fcm_token, title: notif.title, body: notif.body }).catch(() => null)
      }
    }

    return json({ data: updated, error: null })
  } catch (err) {
    console.error('owner-queue-update error:', err)
    return error('Failed to update queue', 500)
  }
})
