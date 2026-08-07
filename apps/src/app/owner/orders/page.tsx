'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@saloo/lib'

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL

async function token() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

const STATUS: Record<string, { label: string; color: string }> = {
  paid:      { label: 'New',       color: 'bg-blue-100 text-blue-700' },
  ready:     { label: 'Ready',     color: 'bg-amber-100 text-amber-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-600' },
  refunded:  { label: 'Refunded',  color: 'bg-gray-100 text-gray-500' },
}

export default function OwnerOrdersPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('active')

  const { data, isLoading } = useQuery({
    queryKey: ['owner-orders', tab],
    queryFn: async () => {
      const res = await fetch(`${BASE}/functions/v1/owner-orders-list?status=${tab}`, { headers: { Authorization: `Bearer ${await token()}` } })
      return (await res.json()).data
    },
    refetchInterval: 20000,
  })

  const update = useMutation({
    mutationFn: async ({ order_id, status }: { order_id: string; status: string }) => {
      const res = await fetch(`${BASE}/functions/v1/owner-order-update`, {
        method: 'POST', headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id, status }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
      return json.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner-orders'] }),
    onError: (e: Error) => alert(e.message),
  })

  const orders = data?.orders ?? []

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="font-syne text-2xl font-bold text-saloo-dark">Product Orders</h1>
        <p className="text-saloo-dark/50 text-sm mt-0.5">Fulfil orders from your store</p>
      </div>

      <div className="flex gap-1 bg-white/60 backdrop-blur-md border border-white/80 rounded-xl p-1 w-fit">
        {[{ k: 'active', l: 'Active' }, { k: 'completed', l: 'Completed' }, { k: 'all', l: 'All' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.k ? 'bg-saloo-pink text-white' : 'text-saloo-dark/60'}`}>{t.l}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-28 bg-white/60 border border-white/80 rounded-2xl animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-10 text-center"><p className="text-saloo-dark/40 text-sm">No orders here</p></div>
      ) : (
        <div className="space-y-3">
          {orders.map((o: any) => {
            const st = STATUS[o.status] ?? { label: o.status, color: 'bg-gray-100 text-gray-500' }
            const items = o.items ?? []
            return (
              <div key={o.id} className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-saloo-dark/60 text-xs">{o.order_ref}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-saloo-dark font-semibold text-sm mt-1">{o.user?.name ?? 'Customer'}{o.user?.phone ? ` · ${o.user.phone}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-syne font-bold text-saloo-dark">{formatINR(o.total_amount)}</p>
                    <p className="text-saloo-dark/40 text-[10px]">you get {formatINR(o.shop_net)}</p>
                  </div>
                </div>
                <div className="mt-2 space-y-0.5">
                  {items.map((it: any) => (
                    <p key={it.id} className="text-saloo-dark/60 text-xs">{it.quantity}× {it.name} · {formatINR(it.price * it.quantity)}</p>
                  ))}
                </div>
                {o.customer_note && <p className="text-saloo-dark/50 text-xs mt-1 italic">"{o.customer_note}"</p>}

                {(o.status === 'paid' || o.status === 'ready') && (
                  <div className="flex gap-2 mt-3">
                    {o.status === 'paid' && (
                      <button onClick={() => update.mutate({ order_id: o.id, status: 'ready' })} disabled={update.isPending}
                        className="px-4 py-2 bg-amber-500/15 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-500/25">Mark Ready</button>
                    )}
                    {o.status === 'ready' && (
                      <button onClick={() => update.mutate({ order_id: o.id, status: 'completed' })} disabled={update.isPending}
                        className="px-4 py-2 bg-green-500/15 text-green-600 rounded-lg text-xs font-bold hover:bg-green-500/25">✓ Complete</button>
                    )}
                    <button onClick={() => { if (confirm('Cancel this order? Stock is restored and the buyer is refunded.')) update.mutate({ order_id: o.id, status: 'cancelled' }) }} disabled={update.isPending}
                      className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500/20">Cancel</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
