// Create a store order + a Razorpay order for the full product total.
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
    const { shop_id, items, fulfillment, customer_note } = await req.json()
    if (!shop_id || !Array.isArray(items) || items.length === 0) return error('shop_id and items required', 400)

    const supabase = createAdminClient()

    const { data: shop } = await supabase
      .from('shops').select('id, store_enabled, store_commission_rate').eq('id', shop_id).single()
    if (!shop) return error('Shop not found', 404)
    if (!shop.store_enabled) return error('This shop is not selling products right now', 422)

    // Load the products and validate stock
    const ids = items.map((i: any) => i.product_id)
    const { data: products } = await supabase
      .from('store_products').select('id, name, price, stock, is_active').eq('shop_id', shop_id).in('id', ids)
    const pMap = Object.fromEntries((products ?? []).map((p: any) => [p.id, p]))

    let subtotal = 0
    const orderItems: any[] = []
    for (const it of items) {
      const p = pMap[it.product_id]
      const qty = Math.max(1, parseInt(it.quantity) || 1)
      if (!p || !p.is_active) return error(`A product is no longer available`, 422)
      if (p.stock < qty) return error(`"${p.name}" is out of stock`, 409)
      subtotal += Number(p.price) * qty
      orderItems.push({ product_id: p.id, name: p.name, price: p.price, quantity: qty })
    }
    if (subtotal <= 0) return error('Invalid order total', 400)

    const rate = shop.store_commission_rate ?? 10
    const commission = Math.round((subtotal * rate) / 100)
    const shop_net = subtotal - commission

    // Create order (pending_payment) + items
    const { data: order, error: oErr } = await supabase
      .from('store_orders')
      .insert({
        user_id: user.id, shop_id, status: 'pending_payment',
        subtotal, commission_rate: rate, commission_amount: commission, shop_net, total_amount: subtotal,
        fulfillment: fulfillment === 'delivery' ? 'delivery' : 'pickup',
        customer_note: customer_note ?? null,
      })
      .select()
      .single()
    if (oErr || !order) throw oErr

    await supabase.from('store_order_items').insert(orderItems.map((i) => ({ ...i, order_id: order.id })))

    // Razorpay order for the full amount
    const amount_paise = Math.round(subtotal * 100)
    const rzp = await createOrder({ amount: amount_paise, receipt: order.order_ref, notes: { store_order_id: order.id, user_id: user.id, shop_id } })

    await supabase.from('store_orders').update({ razorpay_order_id: rzp.id }).eq('id', order.id)

    return json({
      data: {
        order_id: order.id, order_ref: order.order_ref, subtotal, total: subtotal,
        razorpay_order_id: rzp.id, amount: amount_paise, key_id: Deno.env.get('RAZORPAY_KEY_ID') ?? 'demo', dev_mode: IS_DEV_MODE,
      },
      error: null,
    })
  } catch (err) {
    console.error('store-order-create error:', err)
    return error('Failed to create order', 500)
  }
})
