'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@saloo/lib'

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL

async function token() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

const STATUS: Record<string, { label: string; color: string }> = {
  paid:      { label: 'Confirmed', color: 'bg-blue-100 text-blue-700' },
  shipped:   { label: 'Shipped',   color: 'bg-amber-100 text-amber-700' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-600' },
  refunded:  { label: 'Refunded',  color: 'bg-gray-100 text-gray-500' },
}

export default function OwnerOrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['owner-supply-orders'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/functions/v1/owner-orders-list`, { headers: { Authorization: `Bearer ${await token()}` } })
      return (await res.json()).data
    },
    refetchInterval: 30000,
  })

  const orders = data?.orders ?? []

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="font-syne text-2xl font-bold text-saloo-dark">My Orders</h1>
        <p className="text-saloo-dark/50 text-sm mt-0.5">Supplies you've ordered from LooksOn</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-28 bg-white/60 border border-white/80 rounded-2xl animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-10 text-center">
          <div className="text-3xl mb-2">📦</div>
          <p className="text-saloo-dark/50 text-sm">No orders yet</p>
          <a href="/owner/store" className="inline-block mt-3 text-saloo-pink text-sm font-semibold">Browse supplies →</a>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o: any) => {
            const st = STATUS[o.status] ?? { label: o.status, color: 'bg-gray-100 text-gray-500' }
            const items = o.items ?? []
            return (
              <div key={o.id} className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-saloo-dark/60 text-xs">{o.order_ref}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    <span className="text-[9px] text-saloo-dark/40 font-bold uppercase">{o.payment_method === 'wallet' ? 'wallet' : 'online'}</span>
                  </div>
                  <p className="font-syne font-bold text-saloo-dark">{formatINR(o.total_amount)}</p>
                </div>
                <div className="mt-2 space-y-0.5">
                  {items.map((it: any) => <p key={it.id} className="text-saloo-dark/60 text-xs">{it.quantity}× {it.name} · {formatINR(it.price * it.quantity)}</p>)}
                </div>
                {o.status === 'shipped' && <p className="text-amber-600 text-xs mt-2">🚚 On its way to your shop</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
