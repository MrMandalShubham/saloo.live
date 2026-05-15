'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@saloo/lib'

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const CATEGORIES = ['Haircut', 'Beard', 'Hair Color', 'Hair Treatment', 'Skin', 'Combo', 'Other']
const DURATIONS = [15, 30, 45, 60, 90, 120]
const EMPTY = { name: '', category: 'Haircut', duration_min: 30, price: '', description: '', is_addon: false, is_active: true }

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

export default function OwnerServicesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY })
  const [err, setErr] = useState('')

  const { data: services, isLoading } = useQuery({
    queryKey: ['owner-services'],
    queryFn: async () => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-services-list`, { headers: { Authorization: `Bearer ${token}` } })
      const { data } = await res.json()
      return data ?? []
    },
  })

  const upsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-services-upsert`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner-services'] }); setShowForm(false); setEditId(null); setForm({ ...EMPTY }) },
    onError: (e: Error) => setErr(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-services-delete/${id}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner-services'] }),
  })

  function openEdit(s: any) {
    setForm({ name: s.name, category: s.category, duration_min: s.duration_min, price: String(s.price), description: s.description ?? '', is_addon: s.is_addon, is_active: s.is_active })
    setEditId(s.id); setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    if (!form.name || !form.price) { setErr('Name and price required'); return }
    upsertMutation.mutate({ ...form, id: editId, price: parseFloat(form.price) })
  }

  const byCategory: Record<string, any[]> = {}
  for (const s of (services ?? [])) {
    if (!byCategory[s.category]) byCategory[s.category] = []
    byCategory[s.category]!.push(s)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-saloo-dark">Services</h1>
          <p className="text-saloo-dark/50 text-sm mt-0.5">Manage your service catalog</p>
        </div>
        <button
          onClick={() => { setEditId(null); setForm({ ...EMPTY }); setShowForm(!showForm) }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${showForm ? 'bg-white/80 backdrop-blur-md shadow-sm text-saloo-dark/80 hover:bg-white backdrop-blur-md shadow-sm' : 'bg-saloo-pink text-saloo-cream hover:bg-saloo-pink/90'}`}
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
                <button type="button" key={c} onClick={() => setForm({ ...form, category: c })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${form.category === c ? 'bg-saloo-pink text-saloo-cream' : 'bg-white/60 backdrop-blur-md shadow-sm text-saloo-dark/60 hover:bg-white/80 backdrop-blur-md shadow-sm hover:text-saloo-dark/70'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-saloo-dark/50 text-xs uppercase tracking-wider block mb-2.5">Duration</label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map(d => (
                <button type="button" key={d} onClick={() => setForm({ ...form, duration_min: d })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${form.duration_min === d ? 'bg-white text-saloo-cream' : 'bg-white/60 backdrop-blur-md shadow-sm text-saloo-dark/60 hover:bg-white/80 backdrop-blur-md shadow-sm hover:text-saloo-dark/70'}`}>
                  {d}m
                </button>
              ))}
            </div>
          </div>

          <FI label="Price (₹)" value={form.price} onChange={v => setForm({ ...form, price: v })} type="number" />
          <FI label="Description (optional)" value={form.description} onChange={v => setForm({ ...form, description: v })} />

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_addon} onChange={e => setForm({ ...form, is_addon: e.target.checked })} className="w-4 h-4 accent-gold rounded" />
            <span className="text-saloo-dark/70 text-sm">This is an add-on service</span>
          </label>

          <button type="submit" disabled={upsertMutation.isPending}
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
            <p className="text-saloo-dark/50 text-xs uppercase tracking-widest mb-3">{cat}</p>
            <div className="space-y-2">
              {svcs.map(s => (
                <div key={s.id} className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-saloo-dark font-medium text-sm">
                      {s.name}
                      {!s.is_active && <span className="text-saloo-dark/40 text-xs ml-2">(inactive)</span>}
                      {s.is_addon && <span className="text-saloo-pink/50 text-xs ml-2">add-on</span>}
                    </p>
                    <p className="text-saloo-dark/60 text-xs mt-0.5">{s.duration_min}min · {formatINR(s.price)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(s)} className="px-3 py-1.5 bg-white/60 backdrop-blur-md shadow-sm hover:bg-white/80 backdrop-blur-md shadow-sm text-saloo-dark/70 hover:text-saloo-dark text-xs font-medium rounded-lg transition-all">Edit</button>
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
