'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const PROMO_TYPES = [
  { key: 'flat',         label: 'Flat Discount' },
  { key: 'combo',        label: 'Combo Deal' },
  { key: 'happy_hour',   label: 'Happy Hour' },
  { key: 'new_customer', label: 'New Customer' },
  { key: 'loyalty_bonus',label: 'Loyalty Bonus' },
]
const EMPTY = { title: '', type: 'flat', discount_value: '', valid_from: '', valid_until: '', is_active: true }

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

export default function OwnerPromotionsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY })
  const [err, setErr] = useState('')

  const { data: promos, isLoading } = useQuery({
    queryKey: ['owner-promotions'],
    queryFn: async () => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-promotions-list`, { headers: { Authorization: `Bearer ${token}` } })
      const { data } = await res.json()
      return data ?? []
    },
  })

  const upsertMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-promotions-upsert`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner-promotions'] }); setShowForm(false); setEditId(null); setForm({ ...EMPTY }) },
    onError: (e: Error) => setErr(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-promotions-delete/${id}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner-promotions'] }),
  })

  function openEdit(p: any) {
    setForm({ title: p.title, type: p.type, discount_value: String(p.discount_value), valid_from: p.valid_from, valid_until: p.valid_until, is_active: p.is_active })
    setEditId(p.id); setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    if (!form.title || !form.discount_value || !form.valid_from || !form.valid_until) { setErr('All fields required'); return }
    upsertMutation.mutate({ ...form, id: editId, discount_value: parseFloat(form.discount_value) })
  }

  const today = new Date().toISOString().split('T')[0]!

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-white">Promotions</h1>
          <p className="text-white/30 text-sm mt-0.5">Create and manage offers</p>
        </div>
        <button
          onClick={() => { setEditId(null); setForm({ ...EMPTY }); setShowForm(!showForm) }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${showForm ? 'bg-white/10 text-white/60 hover:bg-white/15' : 'bg-gold text-navy hover:bg-gold/90'}`}
        >
          {showForm ? 'Cancel' : '+ New Promo'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 space-y-5">
          <h2 className="font-syne font-bold text-white text-lg">{editId ? 'Edit Promotion' : 'New Promotion'}</h2>
          {err && <p className="text-red-400 text-sm bg-red-400/5 border border-red-400/20 rounded-lg px-3 py-2">{err}</p>}

          <FI label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} />

          <div>
            <label className="text-white/30 text-xs uppercase tracking-wider block mb-2.5">Type</label>
            <div className="flex flex-wrap gap-2">
              {PROMO_TYPES.map(t => (
                <button type="button" key={t.key} onClick={() => setForm({ ...form, type: t.key })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${form.type === t.key ? 'bg-gold text-navy' : 'bg-white/[0.06] text-white/40 hover:bg-white/10 hover:text-white/70'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <FI label="Discount (%)" value={form.discount_value} onChange={v => setForm({ ...form, discount_value: v })} type="number" />

          <div className="grid grid-cols-2 gap-4">
            <FI label="Valid From" value={form.valid_from} onChange={v => setForm({ ...form, valid_from: v })} type="date" placeholder={today} />
            <FI label="Valid Until" value={form.valid_until} onChange={v => setForm({ ...form, valid_until: v })} type="date" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-gold rounded" />
            <span className="text-white/50 text-sm">Active</span>
          </label>

          <button type="submit" disabled={upsertMutation.isPending}
            className="w-full py-3 bg-gold text-navy rounded-xl font-syne font-bold text-sm hover:bg-gold/90 disabled:opacity-40 transition-all">
            {upsertMutation.isPending ? 'Saving…' : editId ? 'Save Changes' : 'Create Promotion'}
          </button>
        </form>
      )}

      {/* Promos list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/[0.04] border border-white/[0.07] rounded-xl animate-pulse" />)}
        </div>
      ) : (promos ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-3">
            <span className="text-gold/30 text-xl">%</span>
          </div>
          <p className="text-white/25 text-sm">No promotions yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(promos ?? []).map((p: any) => (
            <div key={p.id} className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-5 py-4 flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-semibold text-sm">{p.title}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${p.is_active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-white/5 text-white/25 border-white/10'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-white/40 text-xs">{PROMO_TYPES.find(t => t.key === p.type)?.label ?? p.type} · {p.discount_value}% off</p>
                <p className="text-white/20 text-xs mt-0.5">{p.valid_from} — {p.valid_until}</p>
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button onClick={() => openEdit(p)} className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/10 text-white/50 hover:text-white text-xs font-medium rounded-lg transition-all">Edit</button>
                <button onClick={() => { if (window.confirm('Delete this promotion?')) deleteMutation.mutate(p.id) }}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400/70 hover:text-red-400 text-xs font-medium rounded-lg transition-all">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FI({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-white/30 text-xs uppercase tracking-wider block mb-2">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-gold/40 transition-colors" />
    </div>
  )
}
