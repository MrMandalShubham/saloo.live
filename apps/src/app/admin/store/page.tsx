'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@saloo/lib'

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL

async function token() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

const EMPTY = { id: null as string | null, name: '', description: '', price: '', cost_price: '', category: '', stock: '', image_url: '', is_active: true }

export default function AdminStorePage() {
  const qc = useQueryClient()
  const supabase = createClient()
  const [form, setForm] = useState<any>({ ...EMPTY })
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/functions/v1/admin-products-list`, { headers: { Authorization: `Bearer ${await token()}` } })
      return (await res.json()).data ?? []
    },
  })

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, price: parseFloat(form.price), cost_price: form.cost_price ? parseFloat(form.cost_price) : null, stock: parseInt(form.stock) || 0 }
      const res = await fetch(`${BASE}/functions/v1/admin-product-upsert`, {
        method: 'POST', headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
      return json.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); setShowForm(false); setForm({ ...EMPTY }) },
    onError: (e: Error) => setErr(e.message),
  })

  const del = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${BASE}/functions/v1/admin-product-delete`, { method: 'POST', headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  })

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setErr('')
    try {
      const ext = file.name.split('.').pop()
      const path = `catalog/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('store-products').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('store-products').getPublicUrl(path)
      setForm((f: any) => ({ ...f, image_url: publicUrl }))
    } catch (e: any) { setErr(e.message ?? 'Upload failed') } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  function openEdit(p: any) {
    setForm({ id: p.id, name: p.name, description: p.description ?? '', price: String(p.price), cost_price: p.cost_price != null ? String(p.cost_price) : '', category: p.category ?? '', stock: String(p.stock), image_url: p.image_url ?? '', is_active: p.is_active })
    setShowForm(true); setErr('')
  }

  const margin = (p: any) => p.cost_price != null ? Number(p.price) - Number(p.cost_price) : null

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-saloo-dark">Supplies Catalog</h1>
          <p className="text-saloo-dark/50 text-sm mt-0.5">Products LooksOn sells to shops</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY }); setShowForm(!showForm); setErr('') }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${showForm ? 'bg-white/80 text-saloo-dark/80' : 'bg-saloo-pink text-saloo-cream hover:bg-saloo-pink/90'}`}>
          {showForm ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-6 space-y-4">
          {err && <p className="text-red-500 text-sm bg-red-400/5 border border-red-400/20 rounded-lg px-3 py-2">{err}</p>}
          <input ref={fileRef} type="file" accept="image/*" onChange={upload} className="hidden" />
          <div className="flex items-center gap-4">
            {form.image_url ? <img src={form.image_url} alt="" className="w-20 h-20 rounded-xl object-cover border border-white/80" /> : <div className="w-20 h-20 rounded-xl border-2 border-dashed border-saloo-dark/20 flex items-center justify-center text-saloo-dark/30 text-xs">No image</div>}
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="px-4 py-2 bg-white/80 border border-white/80 rounded-xl text-sm font-semibold text-saloo-dark/70 disabled:opacity-40">{uploading ? 'Uploading…' : 'Upload photo'}</button>
          </div>
          <FI label="Name" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} />
          <FI label="Description" value={form.description} onChange={(v: string) => setForm({ ...form, description: v })} />
          <div className="grid grid-cols-2 gap-3">
            <FI label="Sell price to shops (₹)" value={form.price} onChange={(v: string) => setForm({ ...form, price: v })} type="number" />
            <FI label="Your cost (₹, optional)" value={form.cost_price} onChange={(v: string) => setForm({ ...form, cost_price: v })} type="number" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FI label="Stock" value={form.stock} onChange={(v: string) => setForm({ ...form, stock: v })} type="number" />
            <FI label="Category" value={form.category} onChange={(v: string) => setForm({ ...form, category: v })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-saloo-dark/70">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-saloo-pink" /> Active (visible to shops)
          </label>
          <button onClick={() => { if (!form.name || !form.price) { setErr('Name and price required'); return } save.mutate() }} disabled={save.isPending || uploading}
            className="w-full py-3 bg-saloo-pink text-saloo-cream rounded-xl font-syne font-bold text-sm disabled:opacity-40">{save.isPending ? 'Saving…' : form.id ? 'Save Changes' : 'Add Product'}</button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-44 bg-white/60 rounded-2xl animate-pulse" />)}</div>
      ) : products.length === 0 ? (
        <p className="text-saloo-dark/40 text-sm text-center py-16">No products yet. Add products sourced from your suppliers.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {products.map((p: any) => {
            const m = margin(p)
            return (
              <div key={p.id} className="bg-white/60 border border-white/80 rounded-2xl overflow-hidden">
                <div className="aspect-square bg-lavender relative">
                  {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                  {!p.is_active && <span className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full">hidden</span>}
                </div>
                <div className="p-2.5">
                  <p className="text-saloo-dark font-semibold text-xs truncate">{p.name}</p>
                  <p className="text-saloo-dark/60 text-[11px]">{formatINR(p.price)} · {p.stock} in stock</p>
                  {m != null && <p className="text-green-600 text-[10px]">margin {formatINR(m)}/unit</p>}
                  <div className="flex gap-1 mt-2">
                    <button onClick={() => openEdit(p)} className="flex-1 py-1.5 bg-white/80 text-saloo-dark/70 text-[11px] font-medium rounded-lg">Edit</button>
                    <button onClick={() => { if (confirm('Delete product?')) del.mutate(p.id) }} className="px-2 py-1.5 bg-red-500/10 text-red-400 text-[11px] rounded-lg">Del</button>
                  </div>
                </div>
              </div>
            )
          })}
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
