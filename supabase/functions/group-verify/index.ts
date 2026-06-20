// Verify the single group payment and create one booking per held slot.
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
    const { group_id, holds, razorpay_order_id, razorpay_payment_id, razorpay_signature, instructions } = await req.json()
    if (!group_id || !Array.isArray(holds) || holds.length === 0) return error('group_id and holds required', 400)
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return error('Payment params required', 400)

    const isValid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    if (!isValid) return error('Invalid payment signature', 400)

    const supabase = createAdminClient()
    const holdIds = holds.map((h: any) => h.hold_id)
    const labelByHold: Record<string, string> = Object.fromEntries(holds.map((h: any) => [h.hold_id, h.label]))

    const { data: holdRows } = await supabase
      .from('slot_holds').select('*').in('id', holdIds).eq('user_id', user.id)
    if (!holdRows || holdRows.length === 0) return error('Holds not found', 404)

    const shopId = holdRows[0].shop_id
    const { data: shop } = await supabase.from('shops').select('name, owner_id, advance_percentage').eq('id', shopId).single()
    const advancePct = (shop?.advance_percentage ?? 10) / 100

    // Price lookup
    const allSvcIds = [...new Set(holdRows.flatMap((h: any) => [...h.service_ids, ...h.addon_ids]))]
    const { data: services } = await supabase.from('services').select('id, price').in('id', allSvcIds)
    const priceMap = Object.fromEntries((services ?? []).map((s: any) => [s.id, s.price]))

    // Ensure wallet exists
    let { data: wallet } = await supabase.from('wallets').select('id, hold_amount, balance').eq('shop_id', shopId).single()
    if (!wallet) {
      const { data: nw } = await supabase.from('wallets').insert({ shop_id: shopId }).select('id, hold_amount, balance').single()
      wallet = nw
    }

    const created: any[] = []
    for (const hold of holdRows) {
      const total = [...hold.service_ids, ...hold.addon_ids].reduce((s: number, id: string) => s + (priceMap[id] ?? 0), 0)
      const advance = Math.ceil(total * advancePct)

      const { data: booking, error: bErr } = await supabase.from('bookings').insert({
        user_id: user.id,
        shop_id: shopId,
        barber_id: hold.barber_id,
        service_ids: hold.service_ids,
        addon_ids: hold.addon_ids,
        date: hold.hold_date,
        start_time: hold.start_time,
        end_time: hold.end_time,
        status: 'pending_confirmation',
        total_amount: total,
        advance_amount: advance,
        instructions: instructions ?? null,
        group_id,
        group_label: labelByHold[hold.id] ?? null,
      }).select().single()
      if (bErr || !booking) throw bErr

      await supabase.from('payments').insert({
        booking_id: booking.id, user_id: user.id, amount: advance, type: 'advance',
        status: 'captured', method: 'razorpay', razorpay_order_id, razorpay_payment_id, razorpay_signature,
        metadata: { group_id, hold_id: hold.id },
      }).catch(() => null)

      await supabase.from('slot_holds').update({ booking_id: booking.id }).eq('id', hold.id)

      // Wallet hold per booking
      if (wallet) {
        const newHold = (wallet.hold_amount ?? 0) + advance
        await supabase.from('wallets').update({ hold_amount: newHold, updated_at: new Date().toISOString() }).eq('id', wallet.id)
        await supabase.from('wallet_transactions').insert({
          wallet_id: wallet.id, booking_id: booking.id, amount: advance, type: 'hold',
          description: `Group advance hold for ${booking.booking_ref}`, balance_after: wallet.balance ?? 0, hold_after: newHold,
        }).catch(() => null)
        wallet.hold_amount = newHold
      }

      created.push(booking)
    }

    const n = created.length
    // Notify customer
    await supabase.from('notifications').insert({
      user_id: user.id, type: 'booking_pending', title: 'Group Booking Placed!',
      body: `Your group booking for ${n} people at ${shop?.name} is awaiting confirmation.`,
      data: { group_id, count: n },
    }).catch(() => null)

    // Notify owner
    if (shop?.owner_id) {
      await supabase.from('notifications').insert({
        user_id: shop.owner_id, type: 'booking_pending', title: 'New Group Booking!',
        body: `A group of ${n} booked at ${holdRows[0].start_time} on ${holdRows[0].hold_date}. Confirm or reject.`,
        data: { group_id, count: n },
      }).catch(() => null)
      const { data: owner } = await supabase.from('users').select('fcm_token').eq('id', shop.owner_id).single()
      if (owner?.fcm_token) sendPush({ fcmToken: owner.fcm_token, title: 'New Group Booking! 👥', body: `${n} people · ${holdRows[0].hold_date} ${holdRows[0].start_time}` }).catch(() => null)
    }

    return json({ data: { group_id, bookings: created.map((b) => ({ id: b.id, booking_ref: b.booking_ref })) }, error: null })
  } catch (err) {
    console.error('group-verify error:', err)
    return error('Failed to create group booking', 500)
  }
})
