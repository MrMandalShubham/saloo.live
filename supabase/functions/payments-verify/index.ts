// Razorpay webhook handler + client-side payment verify
// Called from client after Razorpay checkout succeeds.

import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'
import { verifySignature } from '../_shared/razorpay.ts'
import { sendPush } from '../_shared/fcm.ts'
import { promoEligible, computeDiscount } from '../_shared/promotions.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { hold_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, instructions, promo_id } = await req.json()

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

    const gross_amount = services?.reduce((sum, s) => sum + s.price, 0) ?? 0
    // Advance was charged on the full price at create-order time — keep it unchanged
    const advance_amount = Math.ceil(gross_amount * 0.1)

    // ── Apply an eligible promotion (discount comes off the at-shop balance) ──
    let discount_amount = 0
    let promotion_id: string | null = null
    if (promo_id) {
      const { data: promo } = await supabase.from('promotions').select('*').eq('id', promo_id).eq('shop_id', hold.shop_id).single()
      if (promo) {
        const { count: priorCount } = await supabase
          .from('bookings').select('id', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('shop_id', hold.shop_id).in('status', ['completed', 'confirmed', 'in_chair'])
        const isNew = (priorCount ?? 0) === 0
        if (promoEligible(promo, { total: gross_amount, serviceIds: hold.service_ids, isNew, startTime: hold.start_time })) {
          discount_amount = Math.min(computeDiscount(promo, gross_amount), gross_amount - advance_amount)
          if (discount_amount > 0) {
            promotion_id = promo.id
            await supabase.from('promotions').update({ usage_count: (promo.usage_count ?? 0) + 1 }).eq('id', promo.id).catch(() => null)
          }
        }
      }
    }
    const total_amount = gross_amount - discount_amount

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
        status: 'pending_confirmation',
        total_amount,
        advance_amount,
        discount_amount,
        promotion_id,
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

    // ── Wallet: hold advance amount ──
    try {
      // Get or create wallet for shop
      let { data: wallet } = await supabase
        .from('wallets')
        .select('id, hold_amount')
        .eq('shop_id', hold.shop_id)
        .single()

      if (!wallet) {
        const { data: newW } = await supabase
          .from('wallets')
          .insert({ shop_id: hold.shop_id })
          .select('id, hold_amount')
          .single()
        wallet = newW
      }

      if (wallet) {
        const newHold = (wallet.hold_amount ?? 0) + advance_amount
        await supabase.from('wallets').update({
          hold_amount: newHold,
          updated_at: new Date().toISOString(),
        }).eq('id', wallet.id)

        await supabase.from('wallet_transactions').insert({
          wallet_id: wallet.id,
          booking_id: booking.id,
          amount: advance_amount,
          type: 'hold',
          description: `Advance hold for ${booking.booking_ref}`,
          balance_after: wallet.balance ?? 0,
          hold_after: newHold,
        })
      }
    } catch (walletErr) {
      console.error('Wallet hold error (non-fatal):', walletErr)
    }

    // Loyalty points are now awarded on dual completion (bookings-complete)

    const { data: userData } = await supabase
      .from('users')
      .select('fcm_token, phone, name')
      .eq('id', user.id)
      .single()

    // Fetch shop and barber names for notifications
    const [{ data: shop }, { data: barber }] = await Promise.all([
      supabase.from('shops').select('name, phone, owner_id').eq('id', hold.shop_id).single(),
      supabase.from('barbers').select('name').eq('id', hold.barber_id).single(),
    ])

    // Notify customer: payment done, waiting for barber
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'booking_pending',
      title: 'Payment Successful!',
      body: `Your payment for ${booking.booking_ref} is done. Waiting for barber confirmation.`,
      data: { booking_id: booking.id, booking_ref: booking.booking_ref },
    })

    // Notify shop owner: new booking needs confirmation
    if (shop?.owner_id) {
      await supabase.from('notifications').insert({
        user_id: shop.owner_id,
        type: 'booking_pending',
        title: 'New Booking Request!',
        body: `${userData?.name ?? 'A customer'} booked ${barber?.name ?? 'a barber'} on ${hold.hold_date} at ${hold.start_time}. Confirm or reject.`,
        data: { booking_id: booking.id, booking_ref: booking.booking_ref },
      })

      // Push to owner
      const { data: ownerData } = await supabase.from('users').select('fcm_token').eq('id', shop.owner_id).single()
      if (ownerData?.fcm_token) {
        sendPush({
          fcmToken: ownerData.fcm_token,
          title: 'New Booking Request! 📋',
          body: `${userData?.name ?? 'Customer'} · ${barber?.name} · ${hold.hold_date} ${hold.start_time}`,
          data: { type: 'booking_pending', booking_id: booking.id },
        }).catch(() => null)
      }
    }

    // Push to customer
    if (userData?.fcm_token) {
      sendPush({
        fcmToken: userData.fcm_token,
        title: 'Payment Successful! 💳',
        body: `${shop?.name} · Waiting for barber confirmation`,
        data: { type: 'booking_pending', booking_id: booking.id },
      }).catch(() => null)
    }

    return json({ data: { booking }, error: null })
  } catch (err) {
    console.error('payments-verify error:', err)
    return error('Payment verification failed', 500)
  }
})
