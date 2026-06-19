'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL

async function token() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  waiting:  { label: 'Waiting',  color: 'bg-amber-100 text-amber-700' },
  called:   { label: 'Called',   color: 'bg-blue-100 text-blue-700' },
  in_chair: { label: 'In Chair', color: 'bg-purple-100 text-purple-700' },
}

const CHAIR_OPTS = [
  { v: 'available', l: 'Available' },
  { v: 'cutting', l: 'Cutting' },
  { v: 'cleanup', l: 'Cleanup' },
  { v: 'break', l: 'Break' },
  { v: 'offline', l: 'Offline' },
]

export default function OwnerQueuePage() {
  const qc = useQueryClient()
  const [selBarber, setSelBarber] = useState<Record<string, string>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [walkName, setWalkName] = useState('')
  const [walkPhone, setWalkPhone] = useState('')
  const [walkBarber, setWalkBarber] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['owner-queue'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/functions/v1/owner-queue-list`, {
        headers: { Authorization: `Bearer ${await token()}` },
      })
      const json = await res.json()
      return json.data
    },
    refetchInterval: 6000,
  })

  const update = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch(`${BASE}/functions/v1/owner-queue-update`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
      return json.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner-queue'] }),
    onError: (e: Error) => alert(e.message),
  })

  const addWalkIn = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/functions/v1/owner-queue-add`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_name: walkName, customer_phone: walkPhone || null, barber_id: walkBarber || null }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
      return json.data
    },
    onSuccess: () => {
      setWalkName(''); setWalkPhone(''); setWalkBarber(''); setShowAdd(false)
      qc.invalidateQueries({ queryKey: ['owner-queue'] })
    },
    onError: (e: Error) => alert(e.message),
  })

  const barbers = data?.barbers ?? []
  const active = data?.active ?? []
  const stats = data?.stats ?? { waiting: 0, in_chair: 0, called: 0, completed_today: 0 }
  const walkInEnabled = data?.shop?.walk_in_enabled ?? true

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-saloo-dark">Live Queue</h1>
          <p className="text-saloo-dark/50 text-sm mt-0.5">Walk-ins & chair management</p>
        </div>
        <button
          onClick={() => update.mutate({ action: 'toggle_walk_in', enabled: !walkInEnabled })}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            walkInEnabled ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
          }`}
        >
          {walkInEnabled ? '● Accepting Walk-ins' : '○ Walk-ins Paused'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Waiting', value: stats.waiting, color: 'text-amber-600' },
          { label: 'In Chair', value: stats.in_chair, color: 'text-purple-600' },
          { label: 'Done Today', value: stats.completed_today, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-4 text-center">
            <p className={`font-syne text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-saloo-dark/50 text-[10px] uppercase tracking-widest font-bold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Chairs */}
      {barbers.length > 0 && (
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-5">
          <p className="text-saloo-dark/50 text-xs uppercase tracking-widest font-bold mb-3">Chairs</p>
          <div className="space-y-2">
            {barbers.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between gap-3">
                <span className="text-saloo-dark text-sm font-medium flex-1">{b.name}</span>
                <select
                  value={b.chair_status}
                  onChange={e => update.mutate({ action: 'chair_status', barber_id: b.id, chair_status: e.target.value })}
                  className="text-xs font-semibold rounded-lg border border-saloo-dark/15 bg-white px-2.5 py-1.5 text-saloo-dark focus:outline-none"
                >
                  {CHAIR_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add walk-in */}
      <div>
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)}
            className="w-full py-3 bg-saloo-pink/10 border border-saloo-pink/20 text-saloo-pink rounded-xl text-sm font-bold hover:bg-saloo-pink/15 transition-all">
            + Add Walk-in Customer
          </button>
        ) : (
          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-5 space-y-3">
            <p className="text-saloo-dark/50 text-xs uppercase tracking-widest font-bold">New Walk-in</p>
            <input value={walkName} onChange={e => setWalkName(e.target.value)} placeholder="Customer name *"
              className="w-full bg-white border border-saloo-dark/15 rounded-xl px-4 py-3 text-saloo-dark text-sm focus:outline-none focus:border-saloo-pink/40" />
            <input value={walkPhone} onChange={e => setWalkPhone(e.target.value)} placeholder="Phone (optional)"
              className="w-full bg-white border border-saloo-dark/15 rounded-xl px-4 py-3 text-saloo-dark text-sm focus:outline-none focus:border-saloo-pink/40" />
            <select value={walkBarber} onChange={e => setWalkBarber(e.target.value)}
              className="w-full bg-white border border-saloo-dark/15 rounded-xl px-4 py-3 text-saloo-dark text-sm focus:outline-none">
              <option value="">Any barber</option>
              {barbers.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={() => { setShowAdd(false); setWalkName('') }}
                className="flex-1 py-2.5 bg-white border border-saloo-dark/10 text-saloo-dark/60 rounded-xl text-sm">Cancel</button>
              <button onClick={() => addWalkIn.mutate()} disabled={!walkName.trim() || addWalkIn.isPending}
                className="flex-1 py-2.5 bg-saloo-pink text-white rounded-xl text-sm font-bold disabled:opacity-40">
                {addWalkIn.isPending ? 'Adding…' : 'Add to Queue'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active queue */}
      <div>
        <p className="text-saloo-dark/50 text-xs uppercase tracking-widest font-bold mb-3">Queue ({active.length})</p>
        {isLoading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 bg-white/60 border border-white/80 rounded-2xl animate-pulse" />)}</div>
        ) : active.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-10 text-center">
            <p className="text-saloo-dark/40 text-sm">No one in the queue right now</p>
          </div>
        ) : (
          <div className="space-y-2">
            {active.map((e: any) => {
              const st = STATUS_STYLE[e.status] ?? STATUS_STYLE.waiting
              const barberDefault = selBarber[e.id] ?? e.barber_id ?? e.assigned_barber_id ?? ''
              return (
                <div key={e.id} className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-saloo-dark/5 flex flex-col items-center justify-center shrink-0">
                      <span className="font-syne font-bold text-saloo-dark text-lg leading-none">{e.token_number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-saloo-dark font-semibold text-sm truncate">{e.customer_name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                        {e.source === 'walk_in' && <span className="text-[9px] text-saloo-dark/40 font-bold">WALK-IN</span>}
                      </div>
                      <p className="text-saloo-dark/50 text-xs mt-0.5 truncate">
                        {(e.services ?? []).join(', ') || 'Haircut'} · ~{e.estimated_duration_min}min
                        {e.customer_phone ? ` · ${e.customer_phone}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {(e.status === 'waiting') && (
                      <button onClick={() => update.mutate({ entry_id: e.id, status: 'called' })}
                        className="px-3 py-1.5 bg-blue-500/15 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-500/25">📢 Call</button>
                    )}
                    {(e.status === 'waiting' || e.status === 'called') && (
                      <>
                        <select value={barberDefault}
                          onChange={ev => setSelBarber(s => ({ ...s, [e.id]: ev.target.value }))}
                          className="text-xs rounded-lg border border-saloo-dark/15 bg-white px-2 py-1.5 text-saloo-dark focus:outline-none">
                          <option value="">Pick chair…</option>
                          {barbers.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <button onClick={() => update.mutate({ entry_id: e.id, status: 'in_chair', barber_id: barberDefault || undefined })}
                          className="px-3 py-1.5 bg-purple-500/15 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-500/25">▶ Start</button>
                      </>
                    )}
                    {e.status === 'in_chair' && (
                      <button onClick={() => update.mutate({ entry_id: e.id, status: 'completed', barber_id: e.assigned_barber_id || undefined })}
                        className="px-3 py-1.5 bg-green-500/15 text-green-600 rounded-lg text-xs font-bold hover:bg-green-500/25">✓ Complete</button>
                    )}
                    <button onClick={() => { if (confirm('Mark as no-show / remove?')) update.mutate({ entry_id: e.id, status: 'no_show', barber_id: e.assigned_barber_id || undefined }) }}
                      className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500/20">✕ No-show</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
