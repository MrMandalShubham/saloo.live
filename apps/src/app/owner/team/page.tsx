'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

export default function OwnerTeamPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', specialties: '' })
  const [error, setError] = useState('')

  const { data: team, isLoading } = useQuery({
    queryKey: ['owner-team'],
    queryFn: async () => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-team-list`, { headers: { Authorization: `Bearer ${token}` } })
      const { data } = await res.json()
      return data ?? []
    },
  })

  const inviteMutation = useMutation({
    mutationFn: async (payload: any) => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-team-invite`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner-team'] }); setShowForm(false); setForm({ name: '', phone: '', specialties: '' }) },
    onError: (e: Error) => setError(e.message),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-team-update/${id}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner-team'] }),
  })

  function handleInvite(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!form.name || !form.phone) { setError('Name and phone required'); return }
    inviteMutation.mutate({
      name: form.name.trim(), phone: form.phone.trim(),
      specialties: form.specialties.split(',').map(s => s.trim()).filter(Boolean),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-saloo-dark">Team</h1>
          <p className="text-saloo-dark/50 text-sm mt-0.5">Manage your barbers</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${showForm ? 'bg-white/80 backdrop-blur-md shadow-sm text-saloo-dark/80 hover:bg-white backdrop-blur-md shadow-sm' : 'bg-saloo-pink text-saloo-cream hover:bg-saloo-pink/90'}`}>
          {showForm ? 'Cancel' : '+ Add Barber'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleInvite} className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-6 space-y-5">
          <h2 className="font-syne font-bold text-saloo-dark text-lg">Invite Barber</h2>
          {error && <p className="text-red-400 text-sm bg-red-400/5 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
          <FI label="Full Name"                      value={form.name}        onChange={v => setForm({ ...form, name: v })} />
          <FI label="Phone (+91…)"                   value={form.phone}       onChange={v => setForm({ ...form, phone: v })} type="tel" />
          <FI label="Specialties (comma separated)"  value={form.specialties} onChange={v => setForm({ ...form, specialties: v })} />
          <button type="submit" disabled={inviteMutation.isPending}
            className="w-full py-3 bg-saloo-pink text-saloo-cream rounded-xl font-syne font-bold text-sm hover:bg-saloo-pink/90 disabled:opacity-40">
            {inviteMutation.isPending ? 'Inviting…' : 'Send Invite'}
          </button>
        </form>
      )}

      {/* Team list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl animate-pulse" />)}
        </div>
      ) : (team ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/60 backdrop-blur-md shadow-sm border border-white/80 flex items-center justify-center mb-3">
            <span className="text-saloo-dark/40 text-xl">◉</span>
          </div>
          <p className="text-saloo-dark/50 text-sm">No team members yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(team ?? []).map((b: any) => (
            <div key={b.id} className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-navy border border-white/80 flex items-center justify-center shrink-0">
                  <span className="font-syne font-bold text-saloo-pink text-sm">{b.name?.[0] ?? '?'}</span>
                </div>
                <div>
                  <p className="text-saloo-dark font-semibold text-sm">{b.name}</p>
                  <p className="text-saloo-dark/60 text-xs">{b.phone}</p>
                  {b.specialties?.length > 0 && (
                    <p className="text-saloo-pink/60 text-xs mt-0.5">{b.specialties.join(', ')}</p>
                  )}
                  <p className="text-saloo-dark/40 text-xs mt-0.5">★ {b.rating?.toFixed(1) ?? 'N/A'} · {b.invite_status}</p>
                </div>
              </div>
              <button
                onClick={() => toggleMutation.mutate({ id: b.id, is_active: !b.is_active })}
                disabled={toggleMutation.isPending}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  b.is_active
                    ? 'bg-red-500/10 text-red-400/70 hover:bg-red-500/20 hover:text-red-400'
                    : 'bg-green-500/10 text-green-400/70 hover:bg-green-500/20 hover:text-green-400'
                }`}
              >
                {b.is_active ? 'Deactivate' : 'Activate'}
              </button>
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
        className="w-full bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-4 py-3 text-saloo-dark text-sm placeholder-white/20 focus:outline-none focus:border-saloo-pink/40 transition-colors" />
    </div>
  )
}
