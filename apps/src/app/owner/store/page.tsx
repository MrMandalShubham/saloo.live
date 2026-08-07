'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Script from 'next/script'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@saloo/lib'

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL

async function sess() {
  const { data: { session } } = await createClient().auth.getSession()
  return session
}

export default function OwnerSuppliesPage() {
  const router = useRouter()
  const [cart, setCart] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [payWith, setPayWith] = useState<'razorpay' | 'wallet'>('razorpay')

  const { data, isLoading } = useQuery({
    queryKey: ['supplies-catalog'],
    queryFn: async () => {
      const s = await sess()
      const res = await fetch(`${BASE}/functions/v1/store-products-list`, { headers: { Authorization: `Bearer ${s?.access_token}` } })
      return (await res.json()).data
    },
  })

  const products = data?.products ?? []
  const walletBalance = data?.wallet_balance ?? 0
  const setQty = (id: string, q: number) => setCart(c => { const n = { ...c }; if (q <= 0) delete n[id]; else n[id] = q; return n })
  const cartItems = products.filter((p: any) => cart[p.id] > 0)
  const total = cartItems.reduce((s: number, p: any) => s + Number(p.price) * cart[p.id], 0)
  const count = Object.values(cart).reduce((s, q) => s + q, 0)
  const canWallet = walletBalance >= total && total > 0

  async function checkout() {
    setBusy(true)
    try {
      const s = await sess()
      const items = Object.entries(cart).map(([product_id, quantity]) => ({ product_id, quantity }))
      const method = payWith === 'wallet' && canWallet ? 'wallet' : 'razorpay'
      const res = await fetch(`${BASE}/functions/v1/store-order-create`, {
        method: 'POST', headers: { Authorization: `Bearer ${s?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, payment_method: method }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)

      if (json.data.paid) { setCart({}); router.push('/owner/orders'); return } // wallet paid instantly

      const { order_id, razorpay_order_id, amount, key_id, dev_mode } = json.data
      const finish = async (pid: string, sig: string) => {
        const v = await fetch(`${BASE}/functions/v1/store-order-verify`, {
          method: 'POST', headers: { Authorization: `Bearer ${s?.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id, razorpay_order_id, razorpay_payment_id: pid, razorpay_signature: sig }),
        })
        const vj = await v.json(); if (vj.error) throw new Error(vj.error.message ?? vj.error)
        setCart({}); router.push('/owner/orders')
      }
      const Razorpay = (window as any).Razorpay
      if (dev_mode || !Razorpay) { await finish(`pay_demo_${Date.now()}`, 'demo_sig'); return }
      const rzp = new Razorpay({
        key: key_id, amount: String(amount), currency: 'INR', order_id: razorpay_order_id,
        name: 'LooksOn Supplies', description: `${count} item${count > 1 ? 's' : ''}`, theme: { color: '#008B7D' },
        handler: (p: any) => finish(p.razorpay_payment_id, p.razorpay_signature).catch((e: any) => alert(e.message)),
        modal: { ondismiss: () => setBusy(false) },
      })
      rzp.open()
    } catch (e: any) { alert(e.message); setBusy(false) }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="max-w-3xl space-y-5 pb-24">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-syne text-2xl font-bold text-saloo-dark">Supplies</h1>
            <p className="text-saloo-dark/50 text-sm mt-0.5">Order stock from LooksOn at wholesale</p>
          </div>
          <div className="text-right"><p className="font-syne font-bold text-green-600">{formatINR(walletBalance)}</p><p className="text-saloo-dark/40 text-[10px] uppercase tracking-widest font-bold">wallet</p></div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{[1, 2, 3].map(i => <div key={i} className="h-48 bg-white/60 rounded-2xl animate-pulse" />)}</div>
        ) : products.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-10 text-center"><p className="text-saloo-dark/40 text-sm">No supplies available yet. Check back soon.</p></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map((p: any) => {
              const qty = cart[p.id] ?? 0
              const oos = p.stock <= 0
              return (
                <div key={p.id} className="bg-white/60 border border-white/80 rounded-2xl overflow-hidden">
                  <div className="aspect-square bg-lavender relative">
                    {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>}
                    {oos && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><span className="text-xs font-bold text-red-500">Out of stock</span></div>}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-saloo-dark text-sm truncate">{p.name}</p>
                    {p.description && <p className="text-saloo-dark/40 text-[11px] truncate">{p.description}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-syne font-bold text-saloo-dark">{formatINR(p.price)}</span>
                      {qty === 0 ? (
                        <button disabled={oos} onClick={() => setQty(p.id, 1)} className="bg-saloo-pink text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-30">Add</button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setQty(p.id, qty - 1)} className="w-6 h-6 rounded-md bg-saloo-dark/10 text-saloo-dark font-bold">−</button>
                          <span className="text-sm font-bold text-saloo-dark w-4 text-center">{qty}</span>
                          <button disabled={qty >= p.stock} onClick={() => setQty(p.id, qty + 1)} className="w-6 h-6 rounded-md bg-saloo-dark/10 text-saloo-dark font-bold disabled:opacity-30">+</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Checkout bar */}
        {count > 0 && (
          <div className="fixed bottom-0 left-0 right-0 lg:left-56 z-40 bg-white/90 backdrop-blur-xl border-t border-white/80 p-4">
            <div className="max-w-3xl mx-auto space-y-2">
              <div className="flex gap-2">
                <button onClick={() => setPayWith('razorpay')} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${payWith === 'razorpay' ? 'bg-saloo-pink/10 border-saloo-pink/40 text-saloo-pink' : 'border-saloo-dark/15 text-saloo-dark/50'}`}>Pay online</button>
                <button onClick={() => canWallet && setPayWith('wallet')} disabled={!canWallet} className={`flex-1 py-2 rounded-lg text-xs font-bold border disabled:opacity-40 ${payWith === 'wallet' && canWallet ? 'bg-green-500/10 border-green-500/40 text-green-600' : 'border-saloo-dark/15 text-saloo-dark/50'}`}>Use wallet {!canWallet && '(low)'}</button>
              </div>
              <button onClick={checkout} disabled={busy} className="w-full flex items-center justify-between bg-saloo-dark text-white rounded-xl px-5 py-3.5 disabled:opacity-60">
                <span className="font-semibold text-sm">{count} item{count > 1 ? 's' : ''} · {formatINR(total)}</span>
                <span className="font-syne font-bold">{busy ? 'Processing…' : payWith === 'wallet' && canWallet ? 'Pay from wallet →' : 'Checkout →'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
