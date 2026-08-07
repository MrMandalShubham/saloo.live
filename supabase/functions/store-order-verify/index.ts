// Verify the store payment: decrement stock, credit shop wallet (net of commission), notify.
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
    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()
    if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return error('Payment params required', 400)

    const isValid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    if (!isValid) return error('Invalid payment signature', 400)

    const supabase = createAdminClient()

    const { data: order } = await supabase
      .from('store_orders').select('*').eq('id', order_id).eq('user_id', user.id).single()
    if (!order) return error('Order not found', 404)
    if (order.status !== 'pending_payment') {
      return json({ data: order, error: null }) // already processed (idempotent)
    }

    // Mark paid
    const { data: updated } = await supabase
      .from('store_orders')
      .update({ status: 'paid', razorpay_payment_id, updated_at: new Date().toISOString() })
      .eq('id', order_id).select().single()

    // Decrement stock
    const { data: items } = await supabase.from('store_order_items').select('product_id, quantity').eq('order_id', order_id)
    for (const it of items ?? []) {
      if (!it.product_id) continue
      const { data: p } = await supabase.from('store_products').select('stock').eq('id', it.product_id).single()
      if (p) await supabase.from('store_products').update({ stock: Math.max(0, p.stock - it.quantity) }).eq('id', it.product_id)
    }

    // Credit shop wallet (net of LooksOn commission) as a hold, released on fulfilment
    try {
      let { data: wallet } = await supabase.from('wallets').select('id, balance, hold_amount').eq('shop_id', order.shop_id).single()
      if (!wallet) { const { data: nw } = await supabase.from('wallets').insert({ shop_id: order.shop_id }).select('id, balance, hold_amount').single(); wallet = nw }
      if (wallet) {
        const newHold = (wallet.hold_amount ?? 0) + Number(order.shop_net)
        await supabase.from('wallets').update({ hold_amount: newHold, updated_at: new Date().toISOString() }).eq('id', wallet.id)
        await supabase.from('wallet_transactions').insert({
          wallet_id: wallet.id, store_order_id: order.id, amount: order.shop_net, type: 'hold',
          description: `Product order ${order.order_ref} (held)`, balance_after: wallet.balance ?? 0, hold_after: newHold,
        })
      }
    } catch (wErr) { console.error('store wallet hold error (non-fatal):', wErr) }

    // Notify shop owner + customer
    const { data: shop } = await supabase.from('shops').select('name, owner_id').eq('id', order.shop_id).single()
    if (shop?.owner_id) {
      await supabase.from('notifications').insert({
        user_id: shop.owner_id, type: 'booking_pending', title: 'New Product Order! 🛍️',
        body: `Order ${order.order_ref} · ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(order.total_amount)}. Get it ready.`,
        data: { store_order_id: order.id },
      }).catch(() => null)
      const { data: owner } = await supabase.from('users').select('fcm_token').eq('id', shop.owner_id).single()
      if (owner?.fcm_token) sendPush({ fcmToken: owner.fcm_token, title: 'New Product Order 🛍️', body: `${order.order_ref}` }).catch(() => null)
    }
    await supabase.from('notifications').insert({
      user_id: user.id, type: 'booking_confirmed', title: 'Order Placed!',
      body: `Your order ${order.order_ref} at ${shop?.name ?? 'the shop'} is confirmed. You'll be notified when it's ready.`,
      data: { store_order_id: order.id },
    }).catch(() => null)

    return json({ data: updated ?? order, error: null })
  } catch (err) {
    console.error('store-order-verify error:', err)
    return error('Failed to verify order', 500)
  }
})
