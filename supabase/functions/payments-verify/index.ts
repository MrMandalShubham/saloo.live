// Razorpay webhook handler + client-side payment verify
// Called from client after Razorpay checkout succeeds.

import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'
import { verifySignature } from '../_shared/razorpay.ts'
import { sendPush } from '../_shared/fcm.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { hold_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, instructions } = await req.json()

    if (!hold_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return error('Payment verification params are required', 400)
    }

    // Verify signature
    const isValid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    if (!isValid) return error('Invalid payment signature', 400)

    const supabase = createAdminClient()

    // Fetch the hold
    const { data: hold, error: holdErr } = await supabase
      .from('slot_holds')
      .select('*')
      .eq('id', hold_id)
      .eq('user_id', user.id)
      .single()

    if (holdErr || !hold) return error('Hold not found', 404)

    // Fetch services for total calculation
    const { data: services } = await supabase
      .from('services')
      .select('id, price, duration_min')
      .in('id', [...hold.service_ids, ...hold.addon_ids])

    const total_amount = services?.reduce((sum, s) => sum + s.price, 0) ?? 0
    const advance_amount = Math.ceil(total_amount * 0.3)

    // Create the booking
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        shop_id: hold.shop_id,
        barber_id: hold.barber_id,
        service_ids: hold.service_ids,
        addon_ids: hold.addon_ids,
        date: hold.hold_date,
        start_time: hold.start_time,
        end_time: hold.end_time,
        status: 'confirmed',
        total_amount,
        advance_amount,
        instructions: instructions ?? null,
      })
      .select()
      .single()

    if (bookingErr || !booking) throw bookingErr

    // Create payment record
    await supabase.from('payments').insert({
      booking_id: booking.id,
      user_id: user.id,
      amount: advance_amount,
      type: 'advance',
      status: 'captured',
      method: 'razorpay',
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      metadata: { hold_id },
    })

    // Link hold to booking (prevents cleanup)
    await supabase
      .from('slot_holds')
      .update({ booking_id: booking.id })
      .eq('id', hold_id)

    // Award loyalty points (1 pt per ₹1, 1.5x on Mon–Thu)
    const bookingDate = new Date(hold.hold_date)
    const dayOfWeek = bookingDate.getDay()
    const multiplier = dayOfWeek >= 1 && dayOfWeek <= 4 ? 1.5 : 1
    const earnedPoints = Math.floor(total_amount * multiplier)

    const { data: userData } = await supabase
      .from('users')
      .select('loyalty_points, fcm_token, phone, name')
      .eq('id', user.id)
      .single()

    const newBalance = (userData?.loyalty_points ?? 0) + earnedPoints

    await Promise.all([
      supabase.from('users').update({ loyalty_points: newBalance }).eq('id', user.id),
      supabase.from('loyalty_transactions').insert({
        user_id: user.id,
        booking_id: booking.id,
        points: earnedPoints,
        type: 'earn',
        description: `Booking ${booking.booking_ref}`,
        balance_after: newBalance,
      }),
    ])

    // Save notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'booking_confirmed',
      title: 'Booking Confirmed!',
      body: `Your booking ${booking.booking_ref} is confirmed.`,
      data: { booking_id: booking.id, booking_ref: booking.booking_ref },
    })

    // Fetch shop and barber names for notifications
    const [{ data: shop }, { data: barber }] = await Promise.all([
      supabase.from('shops').select('name, phone').eq('id', hold.shop_id).single(),
      supabase.from('barbers').select('name').eq('id', hold.barber_id).single(),
    ])

    // Send push notification (non-blocking)
    Promise.allSettled([
      userData?.fcm_token ? sendPush({
        fcmToken: userData.fcm_token,
        title: 'Booking Confirmed! ✅',
        body: `${shop?.name} · ${hold.hold_date} ${hold.start_time}`,
        data: { type: 'booking_confirmed', booking_id: booking.id },
      }) : Promise.resolve(),
    ])

    return json({ data: { booking }, error: null })
  } catch (err) {
    console.error('payments-verify error:', err)
    return error('Payment verification failed', 500)
  }
})
