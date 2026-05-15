import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'
import { sendPushNotification } from '../_shared/fcm.ts'

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed:       ['in_chair', 'no_show', 'cancelled'],
  in_chair:        ['completed'],
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  if (req.method !== 'POST') return error('Method not allowed', 405)

  try {
    const url = new URL(req.url)
    const bookingId = url.pathname.split('/').pop()
    if (!bookingId) return error('Booking ID required', 400)

    const { status } = await req.json()
    const supabase = createAdminClient()

    // Verify shop ownership
    const { data: shop } = await supabase
      .from('shops')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()

    if (!shop) return error('Shop not found', 404)

    // Get current booking
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, status, user_id')
      .eq('id', bookingId)
      .eq('shop_id', shop.id)
      .single()

    if (!booking) return error('Booking not found', 404)

    const allowed = VALID_TRANSITIONS[booking.status] ?? []
    if (!allowed.includes(status)) {
      return error(`Cannot transition from ${booking.status} to ${status}`, 422)
    }

    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === 'no_show') {
      updates.no_show_at = new Date().toISOString()
      // Atomically increment no_show_count on user
      await supabase.rpc('increment_no_show_count' as any, { p_user_id: booking.user_id }).catch(() => null)
    }

    const { data, error: updateErr } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .select()
      .single()

    if (updateErr) throw updateErr

    // Push notification to customer
    const statusMessages: Record<string, string> = {
      confirmed:  `Your booking at ${shop.name} is confirmed!`,
      in_chair:   `Your session has started at ${shop.name}. Enjoy!`,
      completed:  `Your visit to ${shop.name} is complete. Leave a review!`,
      no_show:    `Your booking at ${shop.name} was marked as no-show.`,
      cancelled:  `Your booking at ${shop.name} has been cancelled.`,
    }
    const msg = statusMessages[status]
    if (msg) {
      const { data: customer } = await supabase
        .from('users')
        .select('fcm_token')
        .eq('id', booking.user_id)
        .single()
      if (customer?.fcm_token) {
        await sendPushNotification(customer.fcm_token, 'Booking Update', msg).catch(() => null)
      }
    }

    return json({ data, error: null })
  } catch (err) {
    console.error('owner-bookings-update error:', err)
    return error('Failed to update booking', 500)
  }
})
