import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'
import { createRefund } from '../_shared/razorpay.ts'
import { sendPush } from '../_shared/fcm.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'PATCH') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const bookingId = new URL(req.url).pathname.split('/')[new URL(req.url).pathname.split('/').length - 2]
    const { reason } = await req.json().catch(() => ({ reason: undefined }))

    const supabase = createAdminClient()

    const { data: booking, error: dbErr } = await supabase
      .from('bookings')
      .select('*, payment:payments(id, razorpay_payment_id, amount)')
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .single()

    if (dbErr || !booking) return error('Booking not found', 404)
    if (!['confirmed', 'pending_payment'].includes(booking.status)) {
      return error('Booking cannot be cancelled in current status', 409)
    }

    // Check timing: 2 hour rule
    const appointmentDateTime = new Date(`${booking.date}T${booking.start_time}:00+05:30`)
    const hoursUntilAppointment = (appointmentDateTime.getTime() - Date.now()) / 3600000

    let refund_amount = 0
    let refund_type: 'full' | 'partial' | 'none' = 'none'
    const payment = Array.isArray(booking.payment) ? booking.payment[0] : booking.payment

    if (payment?.razorpay_payment_id) {
      if (hoursUntilAppointment >= 2) {
        refund_amount = booking.advance_amount
        refund_type = 'full'
      } else if (hoursUntilAppointment > 0) {
        refund_amount = Math.floor(booking.advance_amount * 0.5)
        refund_type = 'partial'
      }

      if (refund_amount > 0) {
        const refundResult = await createRefund(payment.razorpay_payment_id, refund_amount * 100)
        await supabase.from('payments').insert({
          booking_id: booking.id,
          user_id: user.id,
          amount: refund_amount,
          type: 'refund',
          status: 'refunded',
          refund_id: refundResult.id,
          metadata: { original_payment_id: payment.id, razorpay_payment_id: payment.razorpay_payment_id },
        })
      }
    } else {
      refund_type = 'none'
    }

    // Update booking status
    await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_by: 'customer',
        cancel_reason: reason ?? null,
      })
      .eq('id', bookingId)

    // Save notification
    const { data: userData } = await supabase
      .from('users')
      .select('fcm_token')
      .eq('id', user.id)
      .single()

    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      body: refund_type === 'full'
        ? `Full refund of ₹${refund_amount} initiated.`
        : refund_type === 'partial'
        ? `Partial refund of ₹${refund_amount} initiated.`
        : 'No refund — cancelled within 2 hours of appointment.',
      data: { booking_id: booking.id, refund_amount: String(refund_amount) },
    })

    if (userData?.fcm_token) {
      sendPush({
        fcmToken: userData.fcm_token,
        title: 'Booking Cancelled',
        body: refund_type !== 'none' ? `Refund of ₹${refund_amount} initiated` : 'No refund applicable',
      })
    }

    return json({
      data: {
        refund_amount,
        refund_type,
        message: refund_type === 'full'
          ? `Full refund of ₹${refund_amount} will be credited in 3–5 business days.`
          : refund_type === 'partial'
          ? `Partial refund of ₹${refund_amount} will be credited in 3–5 business days.`
          : 'Booking cancelled. No refund applicable.',
      },
      error: null,
    })
  } catch (err) {
    console.error('bookings-cancel error:', err)
    return error('Failed to cancel booking', 500)
  }
})
