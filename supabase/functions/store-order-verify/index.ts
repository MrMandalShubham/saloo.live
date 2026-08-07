// Verify a Razorpay supplies payment: mark paid, decrement stock, notify admins.
import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'
import { verifySignature } from '../_shared/razorpay.ts'

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
    const { data: order } = await supabase.from('store_orders').select('*').eq('id', order_id).eq('user_id', user.id).single()
    if (!order) return error('Order not found', 404)
    if (order.status !== 'pending_payment') return json({ data: order, error: null })

    const { data: updated } = await supabase
      .from('store_orders').update({ status: 'paid', razorpay_payment_id, updated_at: new Date().toISOString() }).eq('id', order_id).select().single()

    // Decrement stock
    const { data: items } = await supabase.from('store_order_items').select('product_id, quantity').eq('order_id', order_id)
    for (const it of items ?? []) {
      if (!it.product_id) continue
      const { data: p } = await supabase.from('store_products').select('stock').eq('id', it.product_id).single()
      if (p) await supabase.from('store_products').update({ stock: Math.max(0, p.stock - it.quantity) }).eq('id', it.product_id)
    }

    const { data: shop } = await supabase.from('shops').select('name').eq('id', order.shop_id).single()
    const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin')
    for (const a of admins ?? []) {
      await supabase.from('notifications').insert({ user_id: a.id, type: 'system', title: 'New Supplies Order 📦', body: `${shop?.name ?? 'A shop'} ordered ${order.order_ref}.`, data: { store_order_id: order_id } }).catch(() => null)
    }

    return json({ data: updated ?? order, error: null })
  } catch (err) {
    console.error('store-order-verify error:', err)
    return error('Failed to verify order', 500)
  }
})
