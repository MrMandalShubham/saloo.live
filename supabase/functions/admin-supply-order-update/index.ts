// Admin fulfils a supply order: paid → shipped → delivered, or cancel (wallet refund + restock).
import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'
import { sendPush } from '../_shared/fcm.ts'

const TRANSITIONS: Record<string, string[]> = {
  paid:    ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return error('Method not allowed', 405)
  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const admin = createAdminClient()
    const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return error('Forbidden', 403)

    const { order_id, status } = await req.json()
    if (!order_id || !status) return error('order_id and status required', 400)

    const { data: order } = await admin.from('store_orders').select('*').eq('id', order_id).single()
    if (!order) return error('Order not found', 404)
    const allowed = TRANSITIONS[order.status] ?? []
    if (!allowed.includes(status)) return error(`Cannot move from ${order.status} to ${status}`, 422)

    const { data: updated } = await admin.from('store_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', order_id).select().single()

    // Cancel → refund (wallet orders auto-refund to wallet) + restock
    if (status === 'cancelled') {
      const { data: items } = await admin.from('store_order_items').select('product_id, quantity').eq('order_id', order_id)
      for (const it of items ?? []) {
        if (!it.product_id) continue
        const { data: p } = await admin.from('store_products').select('stock').eq('id', it.product_id).single()
        if (p) await admin.from('store_products').update({ stock: p.stock + it.quantity }).eq('id', it.product_id)
      }
      if (order.payment_method === 'wallet') {
        const { data: wallet } = await admin.from('wallets').select('id, balance').eq('shop_id', order.shop_id).single()
        if (wallet) {
          const newBal = Number(wallet.balance) + Number(order.total_amount)
          await admin.from('wallets').update({ balance: newBal, updated_at: new Date().toISOString() }).eq('id', wallet.id)
          await admin.from('wallet_transactions').insert({ wallet_id: wallet.id, store_order_id: order_id, amount: order.total_amount, type: 'adjustment', description: `Refund for cancelled supplies order ${order.order_ref}`, balance_after: newBal, hold_after: 0 })
        }
        await admin.from('store_orders').update({ status: 'refunded' }).eq('id', order_id)
      }
    }

    // Notify the shop owner
    const notif = status === 'shipped' ? { title: 'Supplies Shipped 🚚', body: `Order ${order.order_ref} is on its way.` }
      : status === 'delivered' ? { title: 'Supplies Delivered ✅', body: `Order ${order.order_ref} has been delivered.` }
      : { title: 'Order Cancelled', body: `Order ${order.order_ref} was cancelled${order.payment_method === 'wallet' ? ' and refunded to your wallet' : ''}.` }
    await admin.from('notifications').insert({ user_id: order.user_id, type: 'system', title: notif.title, body: notif.body, data: { store_order_id: order_id } }).catch(() => null)
    const { data: owner } = await admin.from('users').select('fcm_token').eq('id', order.user_id).single()
    if (owner?.fcm_token) sendPush({ fcmToken: owner.fcm_token, title: notif.title, body: notif.body }).catch(() => null)

    return json({ data: updated, error: null })
  } catch (err) {
    console.error('admin-supply-order-update error:', err)
    return error('Failed to update order', 500)
  }
})
