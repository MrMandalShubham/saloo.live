// Shop owner buys supplies from LooksOn. Pay from wallet (instant) or Razorpay.
import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'
import { createOrder, IS_DEV_MODE } from '../_shared/razorpay.ts'

async function notifyAdmins(supabase: any, title: string, body: string, data: any) {
  const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin')
  for (const a of admins ?? []) {
    await supabase.from('notifications').insert({ user_id: a.id, type: 'system', title, body, data }).catch(() => null)
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { items, payment_method } = await req.json()
    if (!Array.isArray(items) || items.length === 0) return error('items required', 400)
    const method = payment_method === 'wallet' ? 'wallet' : 'razorpay'

    const supabase = createAdminClient()

    const { data: shop } = await supabase.from('shops').select('id, name').eq('owner_id', user.id).single()
    if (!shop) return error('Only shop owners can order supplies', 403)

    // Validate products + stock
    const ids = items.map((i: any) => i.product_id)
    const { data: products } = await supabase.from('store_products').select('id, name, price, stock, is_active').in('id', ids)
    const pMap = Object.fromEntries((products ?? []).map((p: any) => [p.id, p]))

    let subtotal = 0
    const orderItems: any[] = []
    for (const it of items) {
      const p = pMap[it.product_id]
      const qty = Math.max(1, parseInt(it.quantity) || 1)
      if (!p || !p.is_active) return error('A product is no longer available', 422)
      if (p.stock < qty) return error(`"${p.name}" is out of stock`, 409)
      subtotal += Number(p.price) * qty
      orderItems.push({ product_id: p.id, name: p.name, price: p.price, quantity: qty })
    }
    if (subtotal <= 0) return error('Invalid order total', 400)

    // Create order
    const { data: order, error: oErr } = await supabase
      .from('store_orders')
      .insert({
        user_id: user.id, shop_id: shop.id, status: 'pending_payment',
        subtotal, commission_rate: 0, commission_amount: 0, shop_net: 0, total_amount: subtotal,
        payment_method: method, fulfillment: 'delivery',
      })
      .select().single()
    if (oErr || !order) throw oErr
    await supabase.from('store_order_items').insert(orderItems.map((i) => ({ ...i, order_id: order.id })))

    const decrementStock = async () => {
      for (const it of orderItems) {
        const { data: p } = await supabase.from('store_products').select('stock').eq('id', it.product_id).single()
        if (p) await supabase.from('store_products').update({ stock: Math.max(0, p.stock - it.quantity) }).eq('id', it.product_id)
      }
    }

    // ── Pay from wallet (instant) ──
    if (method === 'wallet') {
      const { data: wallet } = await supabase.from('wallets').select('id, balance').eq('shop_id', shop.id).single()
      if (!wallet || Number(wallet.balance) < subtotal) {
        await supabase.from('store_orders').update({ status: 'cancelled' }).eq('id', order.id)
        return error('Insufficient wallet balance', 422)
      }
      const newBal = Number(wallet.balance) - subtotal
      await supabase.from('wallets').update({ balance: newBal, updated_at: new Date().toISOString() }).eq('id', wallet.id)
      await supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id, store_order_id: order.id, amount: subtotal, type: 'purchase',
        description: `Supplies order ${order.order_ref}`, balance_after: newBal, hold_after: 0,
      })
      await supabase.from('store_orders').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', order.id)
      await decrementStock()
      await notifyAdmins(supabase, 'New Supplies Order 📦', `${shop.name} ordered ${order.order_ref} (wallet).`, { store_order_id: order.id })
      return json({ data: { order_id: order.id, order_ref: order.order_ref, paid: true }, error: null })
    }

    // ── Razorpay ──
    const amount_paise = Math.round(subtotal * 100)
    const rzp = await createOrder({ amount: amount_paise, receipt: order.order_ref, notes: { store_order_id: order.id, shop_id: shop.id } })
    await supabase.from('store_orders').update({ razorpay_order_id: rzp.id }).eq('id', order.id)

    return json({
      data: { order_id: order.id, order_ref: order.order_ref, paid: false, total: subtotal,
        razorpay_order_id: rzp.id, amount: amount_paise, key_id: Deno.env.get('RAZORPAY_KEY_ID') ?? 'demo', dev_mode: IS_DEV_MODE },
      error: null,
    })
  } catch (err) {
    console.error('store-order-create error:', err)
    return error('Failed to create order', 500)
  }
})
