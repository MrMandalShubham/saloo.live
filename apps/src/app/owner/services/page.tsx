'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@saloo/lib'
import Image from 'next/image'

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const CATEGORIES = [
  { key: 'hair', label: 'Hair' },
  { key: 'beard', label: 'Beard' },
  { key: 'skin', label: 'Skin' },
  { key: 'combo', label: 'Combo' },
  { key: 'kids', label: 'Kids' },
  { key: 'other', label: 'Other' },
]
const DURATIONS = [15, 30, 45, 60, 90, 120]
const EMPTY = { name: '', category: 'hair', duration_min: 30, price: '', description: '', is_addon: false, is_active: true, image_url: '' }

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

export default function OwnerServicesPage() {
  const qc = useQueryClient()
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY })
  const [err, setErr] = useState('')
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: services, isLoading } = useQuery({
    queryKey: ['owner-services'],
    queryFn: async () => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-services-list`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
      })
      const { data } = await res.json()
      return data ?? []
    },
  })

  const upsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-services-upsert`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', apikey: ANON_KEY },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
      return json.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner-services'] }); setShowForm(false); setEditId(null); setForm({ ...EMPTY }); setImagePreview(null) },
    onError: (e: Error) => setErr(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-services-delete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', apikey: ANON_KEY },
        body: JSON.stringify({ service_id: id }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner-services'] }),
  })

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setErr('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { setErr('Image must be under 5MB'); return }

    setUploading(true); setErr('')
    try {
      const ext = file.name.split('.').pop()
      const path = `services/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('service-photos').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('service-photos').getPublicUrl(path)
      setForm((f: any) => ({ ...f, image_url: publicUrl }))
      setImagePreview(publicUrl)
    } catch (e: any) {
      setErr(e.message ?? 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  function openEdit(s: any) {
    setForm({ name: s.name, category: s.category, duration_min: s.duration_min, price: String(s.price), description: s.description ?? '', is_addon: s.is_addon, is_active: s.is_active, image_url: s.image_url ?? '' })
    setImagePreview(s.image_url || null)
    setEditId(s.id); setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    if (!form.name || !form.price) { setErr('Name and price required'); return }
    const payload: any = { ...form, id: editId, price: parseFloat(form.price) }
    if (!payload.image_url) delete payload.image_url
    upsertMutation.mutate(payload)
  }

  const byCategory: Record<string, any[]> = {}
  for (const s of (services ?? [])) {
    if (!byCategory[s.category]) byCategory[s.category] = []
    byCategory[s.category]!.push(s)
  }

  const catLabel = (key: string) => CATEGORIES.find(c => c.key === key)?.label ?? key

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-saloo-dark">Services</h1>
          <p className="text-saloo-dark/50 text-sm mt-0.5">Manage your service catalog</p>
        </div>
        <button
          onClick={() => { setEditId(null); setForm({ ...EMPTY }); setImagePreview(null); setShowForm(!showForm) }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${showForm ? 'bg-white/80 backdrop-blur-md shadow-sm text-saloo-dark/80 hover:bg-white' : 'bg-saloo-pink text-saloo-cream hover:bg-saloo-pink/90'}`}
        >
          {showForm ? 'Cancel' : '+ Add Service'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-6 space-y-5">
          <h2 className="font-syne font-bold text-saloo-dark text-lg">{editId ? 'Edit Service' : 'New Service'}</h2>
          {err && <p className="text-red-400 text-sm bg-red-400/5 border border-red-400/20 rounded-lg px-3 py-2">{err}</p>}

          <FI label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />

          <div>
            <label className="text-saloo-dark/50 text-xs uppercase tracking-wider block mb-2.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button type="button" key={c.key} onClick={() => setForm({ ...form, category: c.key })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${form.category === c.key ? 'bg-saloo-pink text-saloo-cream' : 'bg-white/60 backdrop-blur-md shadow-sm text-saloo-dark/60 hover:bg-white/80 hover:text-saloo-dark/70'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-saloo-dark/50 text-xs uppercase tracking-wider block mb-2.5">Duration</label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map(d => (
                <button type="button" key={d} onClick={() => setForm({ ...form, duration_min: d })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${form.duration_min === d ? 'bg-saloo-pink text-saloo-cream' : 'bg-white/60 backdrop-blur-md shadow-sm text-saloo-dark/60 hover:bg-white/80 hover:text-saloo-dark/70'}`}>
                  {d}m
                </button>
              ))}
            </div>
          </div>

          <FI label="Price (₹)" value={form.price} onChange={v => setForm({ ...form, price: v })} type="number" />
          <FI label="Description (optional)" value={form.description} onChange={v => setForm({ ...form, description: v })} />

          {/* Image upload (optional) */}
          <div>
            <label className="text-saloo-dark/50 text-xs uppercase tracking-wider block mb-2">Photo <span className="normal-case text-saloo-dark/30">(optional)</span></label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/80">
                  <Image src={imagePreview} alt="Service" fill className="object-cover" />
                  <button type="button"
                    onClick={() => { setImagePreview(null); setForm({ ...form, image_url: '' }); if (fileRef.current) fileRef.current.value = '' }}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-xs">×</button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-saloo-dark/20 flex flex-col items-center justify-center text-saloo-dark/40 hover:border-saloo-pink/40 hover:text-saloo-pink/60 transition-colors disabled:opacity-40">
                  {uploading ? (
                    <span className="text-xs">Uploading…</span>
                  ) : (
                    <>
                      <span className="text-lg">📷</span>
                      <span className="text-[10px] mt-0.5">Add</span>
                    </>
                  )}
                </button>
              )}
              {imagePreview && (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="text-xs text-saloo-dark/50 hover:text-saloo-dark/70 transition-colors">
                  Change photo
                </button>
              )}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_addon} onChange={e => setForm({ ...form, is_addon: e.target.checked })} className="w-4 h-4 accent-gold rounded" />
            <span className="text-saloo-dark/70 text-sm">This is an add-on service</span>
          </label>

          <button type="submit" disabled={upsertMutation.isPending || uploading}
            className="w-full py-3 bg-saloo-pink text-saloo-cream rounded-xl font-syne font-bold text-sm hover:bg-saloo-pink/90 disabled:opacity-40 transition-all">
            {upsertMutation.isPending ? 'Saving…' : editId ? 'Save Changes' : 'Add Service'}
          </button>
        </form>
      )}

      {/* Services list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl animate-pulse" />)}
        </div>
      ) : Object.keys(byCategory).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-saloo-dark/40 text-sm">No services yet. Add your first service.</p>
        </div>
      ) : (
        Object.entries(byCategory).map(([cat, svcs]) => (
          <div key={cat}>
            <p className="text-saloo-dark/50 text-xs uppercase tracking-widest mb-3">{catLabel(cat)}</p>
            <div className="space-y-2">
              {svcs.map((s: any) => (
                <div key={s.id} className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-5 py-4 flex items-center gap-4">
                  {s.image_url && (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-white/80">
                      <Image src={s.image_url} alt={s.name} fill className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-saloo-dark font-medium text-sm">
                      {s.name}
                      {!s.is_active && <span className="text-saloo-dark/40 text-xs ml-2">(inactive)</span>}
                      {s.is_addon && <span className="text-saloo-pink/50 text-xs ml-2">add-on</span>}
                    </p>
                    <p className="text-saloo-dark/60 text-xs mt-0.5">{s.duration_min}min · {formatINR(s.price)}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(s)} className="px-3 py-1.5 bg-white/60 backdrop-blur-md shadow-sm hover:bg-white/80 text-saloo-dark/70 hover:text-saloo-dark text-xs font-medium rounded-lg transition-all">Edit</button>
                    <button onClick={() => { if (window.confirm('Remove this service?')) deleteMutation.mutate(s.id) }}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400/70 hover:text-red-400 text-xs font-medium rounded-lg transition-all">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function FI({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-saloo-dark/50 text-xs uppercase tracking-wider block mb-2">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-4 py-3 text-saloo-dark text-sm placeholder-white/20 focus:outline-none focus:border-saloo-pink/40 transition-colors" />
    </div>
  )
}
