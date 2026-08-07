'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@saloo/lib'

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

const EMPTY = { id: null as string | null, name: '', description: '', price: '', category: '', stock: '', image_url: '', is_active: true }

export default function OwnerStorePage() {
  const qc = useQueryClient()
  const supabase = createClient()
  const [shop, setShop] = useState<any>(null)
  const [form, setForm] = useState<any>({ ...EMPTY })
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Load shop (store settings)
  useEffect(() => {
    (async () => {
      const res = await fetch(`${BASE}/functions/v1/owner-shop-get`, { headers: { Authorization: `Bearer ${await getToken()}`, apikey: ANON } })
      setShop((await res.json()).data)
    })()
  }, [])

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['owner-store-products', shop?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from('store_products').select('*').eq('shop_id', shop.id).order('sort_order').order('created_at', { ascending: false })
      return data ?? []
    },
    enabled: !!shop?.id,
  })

  async function toggleStore(enabled: boolean) {
    await fetch(`${BASE}/functions/v1/owner-shop-update`, {
      method: 'POST', headers: { Authorization: `Bearer ${await getToken()}`, 'Content-Type': 'application/json', apikey: ANON },
      body: JSON.stringify({ store_enabled: enabled }),
    })
    setShop((s: any) => ({ ...s, store_enabled: enabled }))
  }

  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !shop?.id) return
    setUploading(true); setErr('')
    try {
      const ext = file.name.split('.').pop()
      const path = `${shop.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('store-products').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('store-products').getPublicUrl(path)
      setForm((f: any) => ({ ...f, image_url: publicUrl }))
    } catch (e: any) { setErr(e.message ?? 'Upload failed') } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function save() {
    setErr('')
    if (!form.name || !form.price) { setErr('Name and price required'); return }
    const payload = {
      shop_id: shop.id, name: form.name, description: form.description || null,
      price: parseFloat(form.price), category: form.category || null,
      stock: parseInt(form.stock) || 0, image_url: form.image_url || null, is_active: form.is_active,
      updated_at: new Date().toISOString(),
    }
    const sb = supabase as any
    const q = form.id
      ? sb.from('store_products').update(payload).eq('id', form.id)
      : sb.from('store_products').insert(payload)
    const { error: dbErr } = await q
    if (dbErr) { setErr(dbErr.message); return }
    setShowForm(false); setForm({ ...EMPTY }); qc.invalidateQueries({ queryKey: ['owner-store-products'] })
  }

  async function remove(id: string) {
    if (!confirm('Delete this product?')) return
    await (supabase as any).from('store_products').delete().eq('id', id)
    qc.invalidateQueries({ queryKey: ['owner-store-products'] })
  }

  function openEdit(p: any) {
    setForm({ id: p.id, name: p.name, description: p.description ?? '', price: String(p.price), category: p.category ?? '', stock: String(p.stock), image_url: p.image_url ?? '', is_active: p.is_active })
    setShowForm(true); setErr('')
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-saloo-dark">Store</h1>
          <p className="text-saloo-dark/50 text-sm mt-0.5">Sell products to your customers</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY }); setShowForm(!showForm); setErr('') }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${showForm ? 'bg-white/80 text-saloo-dark/80' : 'bg-saloo-pink text-saloo-cream hover:bg-saloo-pink/90'}`}>
          {showForm ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {/* Store toggle + commission */}
      {shop && (
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-saloo-dark text-sm">Store {shop.store_enabled ? 'live' : 'off'}</p>
            <p className="text-saloo-dark/50 text-xs mt-0.5">LooksOn commission: {shop.store_commission_rate ?? 10}% per sale · you keep the rest in your wallet</p>
          </div>
          <button onClick={() => toggleStore(!shop.store_enabled)}
            className={`w-12 h-7 rounded-full relative transition-colors ${shop.store_enabled ? 'bg-green-500' : 'bg-saloo-dark/20'}`}>
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${shop.store_enabled ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-6 space-y-4">
          {err && <p className="text-red-500 text-sm bg-red-400/5 border border-red-400/20 rounded-lg px-3 py-2">{err}</p>}
          <input ref={fileRef} type="file" accept="image/*" onChange={uploadImage} className="hidden" />
          <div className="flex items-center gap-4">
            {form.image_url ? <img src={form.image_url} alt="" className="w-20 h-20 rounded-xl object-cover border border-white/80" />
              : <div className="w-20 h-20 rounded-xl border-2 border-dashed border-saloo-dark/20 flex items-center justify-center text-saloo-dark/30 text-xs">No image</div>}
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="px-4 py-2 bg-white/80 border border-white/80 rounded-xl text-sm font-semibold text-saloo-dark/70 disabled:opacity-40">{uploading ? 'Uploading…' : 'Upload photo'}</button>
          </div>
          <FI label="Name" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} />
          <FI label="Description" value={form.description} onChange={(v: string) => setForm({ ...form, description: v })} />
          <div className="grid grid-cols-3 gap-3">
            <FI label="Price (₹)" value={form.price} onChange={(v: string) => setForm({ ...form, price: v })} type="number" />
            <FI label="Stock" value={form.stock} onChange={(v: string) => setForm({ ...form, stock: v })} type="number" />
            <FI label="Category" value={form.category} onChange={(v: string) => setForm({ ...form, category: v })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-saloo-dark/70">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-saloo-pink" /> Active (visible to customers)
          </label>
          <button onClick={save} className="w-full py-3 bg-saloo-pink text-saloo-cream rounded-xl font-syne font-bold text-sm">{form.id ? 'Save Changes' : 'Add Product'}</button>
        </div>
      )}

      {/* Product list */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-white/60 rounded-2xl animate-pulse" />)}</div>
      ) : products.length === 0 ? (
        <p className="text-saloo-dark/40 text-sm text-center py-16">No products yet. Add your first one.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {products.map((p: any) => (
            <div key={p.id} className="bg-white/60 border border-white/80 rounded-2xl overflow-hidden">
              <div className="aspect-square bg-lavender relative">
                {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                {!p.is_active && <span className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full">hidden</span>}
                {p.stock === 0 && <span className="absolute top-2 right-2 bg-red-500/90 text-white text-[9px] px-2 py-0.5 rounded-full">out of stock</span>}
              </div>
              <div className="p-2.5">
                <p className="text-saloo-dark font-semibold text-xs truncate">{p.name}</p>
                <p className="text-saloo-dark/60 text-[11px]">{formatINR(p.price)} · {p.stock} in stock</p>
                <div className="flex gap-1 mt-2">
                  <button onClick={() => openEdit(p)} className="flex-1 py-1.5 bg-white/80 text-saloo-dark/70 text-[11px] font-medium rounded-lg">Edit</button>
                  <button onClick={() => remove(p.id)} className="px-2 py-1.5 bg-red-500/10 text-red-400 text-[11px] rounded-lg">Del</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FI({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-saloo-dark/50 text-xs uppercase tracking-wider block mb-2">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-white/60 border border-white/80 rounded-xl px-4 py-3 text-saloo-dark text-sm focus:outline-none focus:border-saloo-pink/40" />
    </div>
  )
}
