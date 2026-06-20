// Create ONE Razorpay order covering the total advance for a group of holds.
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
    const { hold_ids } = await req.json()
    if (!Array.isArray(hold_ids) || hold_ids.length === 0) return error('hold_ids required', 400)

    const supabase = createAdminClient()

    const { data: holds } = await supabase
      .from('slot_holds')
      .select('*')
      .in('id', hold_ids)
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())

    if (!holds || holds.length !== hold_ids.length) return error('Some holds expired — please try again', 404)

    const shopId = holds[0].shop_id
    const { data: shop } = await supabase.from('shops').select('advance_percentage').eq('id', shopId).single()
    const advancePct = (shop?.advance_percentage ?? 10) / 100

    // Sum advances across all holds
    const allSvcIds = [...new Set(holds.flatMap((h: any) => [...h.service_ids, ...h.addon_ids]))]
    const { data: services } = await supabase.from('services').select('id, price').in('id', allSvcIds)
    const priceMap = Object.fromEntries((services ?? []).map((s: any) => [s.id, s.price]))

    let advance_paise = 0
    for (const h of holds) {
      const total = [...h.service_ids, ...h.addon_ids].reduce((s: number, id: string) => s + (priceMap[id] ?? 0), 0)
      advance_paise += Math.ceil(total * advancePct) * 100
    }

    const order = await createOrder({
      amount: advance_paise,
      receipt: `grp_${hold_ids[0].slice(0, 30)}`,
      notes: { user_id: user.id, shop_id: shopId, hold_ids: hold_ids.join(',') },
    })

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
    console.error('group-create-order error:', err)
    return error('Failed to create group order', 500)
  }
})
