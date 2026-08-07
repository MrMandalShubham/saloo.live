// Shop updates a product order: ready → completed (release wallet), or cancel (refund hold + restock).
import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'
import { sendPush } from '../_shared/fcm.ts'

const TRANSITIONS: Record<string, string[]> = {
  paid:  ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { order_id, status } = await req.json()
    if (!order_id || !status) return error('order_id and status required', 400)

    const supabase = createAdminClient()
    const { data: shop } = await supabase.from('shops').select('id, name').eq('owner_id', user.id).single()
    if (!shop) return error('Shop not found', 404)

    const { data: order } = await supabase.from('store_orders').select('*').eq('id', order_id).eq('shop_id', shop.id).single()
    if (!order) return error('Order not found', 404)

    const allowed = TRANSITIONS[order.status] ?? []
    if (!allowed.includes(status)) return error(`Cannot move from ${order.status} to ${status}`, 422)

    const { data: updated } = await supabase
      .from('store_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', order_id).select().single()

    // Wallet: release on completion, cancel (refund the hold) + restock on cancellation
    try {
      const { data: wallet } = await supabase.from('wallets').select('id, balance, hold_amount, total_released, total_cancelled').eq('shop_id', shop.id).single()
      if (wallet) {
        const { data: existing } = await supabase
          .from('wallet_transactions').select('id').eq('wallet_id', wallet.id).eq('store_order_id', order_id).in('type', ['release', 'cancel']).limit(1)
        if (!existing || existing.length === 0) {
          const net = Number(order.shop_net)
          if (status === 'completed') {
            const newHold = Math.max(0, (wallet.hold_amount ?? 0) - net)
            const newBal = (wallet.balance ?? 0) + net
            await supabase.from('wallets').update({ hold_amount: newHold, balance: newBal, total_released: (wallet.total_released ?? 0) + net, updated_at: new Date().toISOString() }).eq('id', wallet.id)
            await supabase.from('wallet_transactions').insert({ wallet_id: wallet.id, store_order_id: order_id, amount: net, type: 'release', description: `Product order ${order.order_ref} released`, balance_after: newBal, hold_after: newHold })
          } else if (status === 'cancelled') {
            const newHold = Math.max(0, (wallet.hold_amount ?? 0) - net)
            await supabase.from('wallets').update({ hold_amount: newHold, total_cancelled: (wallet.total_cancelled ?? 0) + net, updated_at: new Date().toISOString() }).eq('id', wallet.id)
            await supabase.from('wallet_transactions').insert({ wallet_id: wallet.id, store_order_id: order_id, amount: net, type: 'cancel', description: `Product order ${order.order_ref} cancelled`, balance_after: wallet.balance ?? 0, hold_after: newHold })
            // Restock
            const { data: items } = await supabase.from('store_order_items').select('product_id, quantity').eq('order_id', order_id)
            for (const it of items ?? []) {
              if (!it.product_id) continue
              const { data: p } = await supabase.from('store_products').select('stock').eq('id', it.product_id).single()
              if (p) await supabase.from('store_products').update({ stock: p.stock + it.quantity }).eq('id', it.product_id)
            }
          }
        }
      }
    } catch (wErr) { console.error('store order wallet update error (non-fatal):', wErr) }

    // Notify customer
    const notif = status === 'ready'
      ? { title: 'Order Ready! 🛍️', body: `Your order ${order.order_ref} is ready for pickup at ${shop.name}.` }
      : status === 'completed'
        ? { title: 'Order Complete', body: `Thanks! Order ${order.order_ref} is complete.` }
        : { title: 'Order Cancelled', body: `Your order ${order.order_ref} was cancelled. Any payment will be refunded.` }
    await supabase.from('notifications').insert({ user_id: order.user_id, type: 'booking_confirmed', title: notif.title, body: notif.body, data: { store_order_id: order_id } }).catch(() => null)
    const { data: cust } = await supabase.from('users').select('fcm_token').eq('id', order.user_id).single()
    if (cust?.fcm_token) sendPush({ fcmToken: cust.fcm_token, title: notif.title, body: notif.body }).catch(() => null)

    return json({ data: updated, error: null })
  } catch (err) {
    console.error('owner-order-update error:', err)
    return error('Failed to update order', 500)
  }
})
