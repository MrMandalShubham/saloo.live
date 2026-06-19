import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'
import { sendPush } from '../_shared/fcm.ts'

const MAX_RESCHEDULES = 3

const toMin = (t: string) => {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}
const toTime = (mins: number) => {
  const h = Math.floor(mins / 60), m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { booking_id, date, start_time, barber_id } = await req.json()
    if (!booking_id || !date || !start_time) return error('booking_id, date and start_time required', 400)

    const supabase = createAdminClient()

    const { data: booking } = await supabase
      .from('bookings')
      .select('id, user_id, shop_id, barber_id, status, start_time, end_time, date, booking_ref, reschedule_count')
      .eq('id', booking_id)
      .eq('user_id', user.id)
      .single()

    if (!booking) return error('Booking not found', 404)
    if (!['confirmed', 'pending_confirmation'].includes(booking.status)) {
      return error('Only confirmed or pending bookings can be rescheduled', 422)
    }
    if ((booking.reschedule_count ?? 0) >= MAX_RESCHEDULES) {
      return error(`You can reschedule a booking up to ${MAX_RESCHEDULES} times`, 422)
    }

    // Cannot reschedule within 2 hours of the current appointment
    const apptTime = new Date(`${booking.date}T${booking.start_time.slice(0, 5)}:00+05:30`)
    if (apptTime.getTime() - Date.now() < 2 * 3600 * 1000) {
      return error('Bookings can only be rescheduled at least 2 hours in advance', 422)
    }

    // Keep the same service duration
    const durationMin = toMin(booking.end_time) - toMin(booking.start_time)
    const newStartMin = toMin(start_time)
    const newEndMin = newStartMin + durationMin
    const newStart = toTime(newStartMin)
    const newEnd = toTime(newEndMin)
    const newBarber = barber_id ?? booking.barber_id

    // Conflict check against other active bookings for this barber on the new date
    const { data: clashes } = await supabase
      .from('bookings')
      .select('id, start_time, end_time')
      .eq('barber_id', newBarber)
      .eq('date', date)
      .in('status', ['confirmed', 'in_chair', 'pending_confirmation'])
      .neq('id', booking_id)

    const overlap = (clashes ?? []).some((b: any) => {
      const s = toMin(b.start_time), e = toMin(b.end_time)
      return s < newEndMin && e > newStartMin
    })
    if (overlap) return error('That slot is no longer available. Please pick another time.', 409)

    const { data: updated, error: updErr } = await supabase
      .from('bookings')
      .update({
        date,
        start_time: newStart,
        end_time: newEnd,
        barber_id: newBarber,
        reschedule_count: (booking.reschedule_count ?? 0) + 1,
        rescheduled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)
      .select()
      .single()

    if (updErr) throw updErr

    // Notify shop owner
    const { data: shop } = await supabase.from('shops').select('name, owner_id').eq('id', booking.shop_id).single()
    if (shop?.owner_id) {
      await supabase.from('notifications').insert({
        user_id: shop.owner_id,
        type: 'booking_pending',
        title: 'Booking Rescheduled',
        body: `${booking.booking_ref} was moved to ${date} at ${newStart}.`,
        data: { booking_id },
      }).catch(() => null)

      const { data: owner } = await supabase.from('users').select('fcm_token').eq('id', shop.owner_id).single()
      if (owner?.fcm_token) {
        sendPush({ fcmToken: owner.fcm_token, title: 'Booking Rescheduled 🗓', body: `${booking.booking_ref} → ${date} ${newStart}` }).catch(() => null)
      }
    }

    return json({ data: updated, error: null })
  } catch (err) {
    console.error('bookings-reschedule error:', err)
    return error('Failed to reschedule booking', 500)
  }
})
