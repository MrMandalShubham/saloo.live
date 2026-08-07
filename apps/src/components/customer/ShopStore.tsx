'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Script from 'next/script'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@saloo/lib'

const BASE = process.env['NEXT_PUBLIC_SUPABASE_URL']
const ANON = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''

async function session() {
  const { data: { session } } = await createClient().auth.getSession()
  return session
}

export function ShopStore({ shopId, shopName }: { shopId: string; shopName: string }) {
  const router = useRouter()
  const [cart, setCart] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['shop-store', shopId],
    queryFn: async () => {
      const res = await fetch(`${BASE}/functions/v1/store-products-list?shop_id=${shopId}`, { headers: { apikey: ANON } })
      return (await res.json()).data
    },
  })

  const products = data?.products ?? []
  const setQty = (id: string, q: number) => setCart(c => { const n = { ...c }; if (q <= 0) delete n[id]; else n[id] = q; return n })
  const cartItems = products.filter((p: any) => cart[p.id] > 0)
  const total = cartItems.reduce((s: number, p: any) => s + Number(p.price) * cart[p.id], 0)
  const count = Object.values(cart).reduce((s, q) => s + q, 0)

  async function checkout() {
    const s = await session()
    if (!s) { router.push('/login'); return }
    setBusy(true)
    try {
      const items = Object.entries(cart).map(([product_id, quantity]) => ({ product_id, quantity }))
      const createRes = await fetch(`${BASE}/functions/v1/store-order-create`, {
        method: 'POST', headers: { Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json', apikey: ANON },
        body: JSON.stringify({ shop_id: shopId, items }),
      })
      const createJson = await createRes.json()
      if (createJson.error) throw new Error(createJson.error.message ?? createJson.error)
      const { order_id, razorpay_order_id, amount, key_id, dev_mode } = createJson.data

      const finish = async (paymentId: string, sig: string) => {
        const vRes = await fetch(`${BASE}/functions/v1/store-order-verify`, {
          method: 'POST', headers: { Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json', apikey: ANON },
          body: JSON.stringify({ order_id, razorpay_order_id, razorpay_payment_id: paymentId, razorpay_signature: sig }),
        })
        const vJson = await vRes.json()
        if (vJson.error) throw new Error(vJson.error.message ?? vJson.error)
        setCart({}); router.push('/orders')
      }

      const Razorpay = (window as any).Razorpay
      if (dev_mode || !Razorpay) { await finish(`pay_demo_${Date.now()}`, 'demo_sig'); return }
      const rzp = new Razorpay({
        key: key_id, amount: String(amount), currency: 'INR', order_id: razorpay_order_id,
        name: shopName, description: `${count} item${count > 1 ? 's' : ''}`, theme: { color: '#008B7D' },
        handler: (p: any) => finish(p.razorpay_payment_id, p.razorpay_signature).catch((e: any) => alert(e.message)),
        modal: { ondismiss: () => setBusy(false) },
      })
      rzp.open()
    } catch (e: any) { alert(e.message); setBusy(false) }
  }

  if (isLoading) return <div className="grid grid-cols-2 gap-3">{[1, 2].map(i => <div key={i} className="h-48 bg-lavender rounded-2xl animate-pulse" />)}</div>
  if (!data?.store_enabled || products.length === 0) {
    return <div className="text-center py-10 text-muted text-sm">No products available yet.</div>
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="grid grid-cols-2 gap-3 pb-20">
        {products.map((p: any) => {
          const qty = cart[p.id] ?? 0
          const oos = p.stock <= 0
          return (
            <div key={p.id} className="bg-white border border-border rounded-2xl overflow-hidden">
              <div className="aspect-square bg-lavender relative">
                {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>}
                {oos && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><span className="text-xs font-bold text-red-500">Out of stock</span></div>}
              </div>
              <div className="p-3">
                <p className="font-semibold text-navy text-sm truncate">{p.name}</p>
                {p.description && <p className="text-muted text-[11px] truncate">{p.description}</p>}
                <div className="flex items-center justify-between mt-2">
                  <span className="font-syne font-bold text-navy">{formatINR(p.price)}</span>
                  {qty === 0 ? (
                    <button disabled={oos} onClick={() => setQty(p.id, 1)}
                      className="bg-saloo-teal text-navy text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-30">Add</button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQty(p.id, qty - 1)} className="w-6 h-6 rounded-md bg-lavender text-navy font-bold">−</button>
                      <span className="text-sm font-bold text-navy w-4 text-center">{qty}</span>
                      <button disabled={qty >= p.stock} onClick={() => setQty(p.id, qty + 1)} className="w-6 h-6 rounded-md bg-lavender text-navy font-bold disabled:opacity-30">+</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sticky checkout bar */}
      {count > 0 && (
        <div className="fixed bottom-[68px] left-0 right-0 md:sticky md:bottom-4 z-40 px-4">
          <button onClick={checkout} disabled={busy}
            className="w-full max-w-4xl mx-auto flex items-center justify-between bg-navy text-white rounded-2xl px-5 py-4 shadow-royal-lg disabled:opacity-60">
            <span className="font-semibold text-sm">{count} item{count > 1 ? 's' : ''} · {formatINR(total)}</span>
            <span className="font-syne font-bold">{busy ? 'Processing…' : 'Checkout →'}</span>
          </button>
        </div>
      )}
    </>
  )
}
