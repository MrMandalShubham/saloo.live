// Create a Razorpay order for the advance payment (30% of total)

import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'
import { createOrder, IS_DEV_MODE } from '../_shared/razorpay.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { hold_id } = await req.json()
    if (!hold_id) return error('hold_id is required', 400)

    const supabase = createAdminClient()

    // Fetch the hold
    const { data: hold, error: holdErr } = await supabase
      .from('slot_holds')
      .select('*')
      .eq('id', hold_id)
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (holdErr || !hold) return error('Hold not found or expired', 404)

    // Fetch shop's advance percentage
    const { data: shop } = await supabase
      .from('shops')
      .select('advance_percentage')
      .eq('id', hold.shop_id)
      .single()
    const advancePct = (shop?.advance_percentage ?? 30) / 100

    // Fetch services to compute advance amount
    const { data: services } = await supabase
      .from('services')
      .select('price')
      .in('id', [...hold.service_ids, ...hold.addon_ids])

    const total_amount = services?.reduce((sum, s) => sum + s.price, 0) ?? 0
    const advance_paise = Math.ceil(total_amount * advancePct) * 100  // in paise

    // Create Razorpay order
    const order = await createOrder({
      amount: advance_paise,
      receipt: hold_id,
      notes: {
        hold_id,
        user_id: user.id,
        shop_id: hold.shop_id,
      },
    })

    // Payment record is created in payments-verify after booking is confirmed
    // (avoids FK constraint issue — booking doesn't exist yet at this stage)

    return json({
      data: {
        razorpay_order_id: order.id,
        amount: advance_paise,
        currency: 'INR',
        key_id: Deno.env.get('RAZORPAY_KEY_ID') ?? 'demo',
        dev_mode: IS_DEV_MODE,
      },
      error: null,
    })
  } catch (err) {
    console.error('payments-create-order error:', err)
    return error('Failed to create payment order', 500)
  }
})
