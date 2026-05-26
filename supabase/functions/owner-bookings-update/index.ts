import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'
import { sendPush } from '../_shared/fcm.ts'

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_payment:      ['confirmed', 'cancelled'],
  pending_confirmation: ['confirmed', 'cancelled'],
  confirmed:            ['in_chair', 'no_show', 'cancelled'],
  in_chair:             ['completed'],
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

    // Notification config per status
    const notifConfig: Record<string, { type: string; title: string; body: string; pushTitle: string }> = {
      confirmed:  { type: 'booking_confirmed', title: 'Booking Confirmed! ✅', body: `Your booking at ${shop.name} has been confirmed by the barber. See you there!`, pushTitle: 'Booking Confirmed! ✅' },
      in_chair:   { type: 'booking_confirmed', title: 'Session Started', body: `Your session has started at ${shop.name}. Enjoy!`, pushTitle: 'Session Started! 💈' },
      completed:  { type: 'booking_completed', title: 'Visit Complete', body: `Your visit to ${shop.name} is complete. Leave a review!`, pushTitle: 'Visit Complete! ⭐' },
      no_show:    { type: 'no_show', title: 'No Show', body: `Your booking at ${shop.name} was marked as no-show.`, pushTitle: 'No Show ❌' },
      cancelled:  { type: 'booking_rejected', title: 'Booking Cancelled', body: `Your booking at ${shop.name} has been cancelled by the shop.`, pushTitle: 'Booking Cancelled ❌' },
    }
    const notif = notifConfig[status]
    if (notif) {
      // Save in-app notification
      await supabase.from('notifications').insert({
        user_id: booking.user_id,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        data: { booking_id: bookingId },
      })

      // Push notification
      const { data: customer } = await supabase
        .from('users')
        .select('fcm_token')
        .eq('id', booking.user_id)
        .single()
      if (customer?.fcm_token) {
        await sendPush({ fcmToken: customer.fcm_token, title: notif.pushTitle, body: notif.body }).catch(() => null)
      }
    }

    return json({ data, error: null })
  } catch (err) {
    console.error('owner-bookings-update error:', err)
    return error('Failed to update booking', 500)
  }
})
