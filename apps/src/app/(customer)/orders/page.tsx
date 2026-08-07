'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@saloo/lib'

const BASE = process.env['NEXT_PUBLIC_SUPABASE_URL']

async function token() {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token
}

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending_payment: { label: 'Pending', color: '#854D0E', bg: '#FEF9C3' },
  paid:      { label: 'Confirmed', color: '#1D4ED8', bg: '#DBEAFE' },
  ready:     { label: 'Ready for pickup', color: '#B45309', bg: '#FEF3C7' },
  completed: { label: 'Completed', color: '#15803D', bg: '#DCFCE7' },
  cancelled: { label: 'Cancelled', color: '#B91C1C', bg: '#FEE2E2' },
  refunded:  { label: 'Refunded', color: '#6B7280', bg: '#F3F4F6' },
}

export default function OrdersPage() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/functions/v1/customer-orders-list`, { headers: { Authorization: `Bearer ${await token()}` } })
      return (await res.json()).data ?? []
    },
  })

  return (
    <div className="space-y-5 pb-4 max-w-2xl mx-auto">
      <div>
        <h1 className="font-syne text-2xl font-bold text-navy">My Orders</h1>
        <p className="text-muted text-sm mt-0.5">Products you've bought</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-28 bg-white border border-border rounded-2xl animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white border border-border rounded-2xl">
          <div className="text-4xl mb-2">🛍️</div>
          <p className="font-syne font-bold text-navy">No orders yet</p>
          <p className="text-muted text-sm mt-1">Products you buy from shops will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o: any) => {
            const shop = Array.isArray(o.shop) ? o.shop[0] : o.shop
            const st = STATUS[o.status] ?? { label: o.status, color: '#6B7280', bg: '#F3F4F6' }
            const items = o.items ?? []
            return (
              <div key={o.id} className="bg-white border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-syne font-bold text-navy text-sm">{shop?.name}</p>
                    <p className="text-[11px] text-muted font-mono">{o.order_ref}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-pill font-semibold" style={{ color: st.color, backgroundColor: st.bg }}>{st.label}</span>
                </div>
                <div className="mt-2 space-y-0.5">
                  {items.map((it: any) => <p key={it.id} className="text-secondary text-xs">{it.quantity}× {it.name}</p>)}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/60">
                  <span className="text-muted text-xs">{o.fulfillment === 'delivery' ? 'Delivery' : 'Pickup at shop'}</span>
                  <span className="font-syne font-bold text-navy">{formatINR(o.total_amount)}</span>
                </div>
                {o.status === 'ready' && shop?.address && (
                  <p className="text-amber-600 text-xs mt-2">📍 Ready — pick up at {shop.address}{shop.phone ? ` · ${shop.phone}` : ''}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
