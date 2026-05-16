'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const OPEN_HOURS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00']
const CLOSE_HOURS = ['13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00']
const BREAK_STARTS = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00']
const BREAK_ENDS = ['11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00']

type HourRow = { day_of_week: number; open_time: string; close_time: string; is_closed: boolean }
type BreakRow = { day_of_week: number | null; start_time: string; end_time: string; label: string }
type SlotBlock = { id: string; shop_id: string; barber_id: string | null; block_date: string | null; start_time: string; end_time: string; reason: string | null }

function makeDefaults(): HourRow[] {
  return Array.from({ length: 7 }, (_, i) => ({ day_of_week: i, open_time: '09:00', close_time: '20:00', is_closed: i === 0 }))
}

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function OwnerAvailabilityPage() {
  const qc = useQueryClient()
  const initialized = useRef(false)
  const [tab, setTab] = useState<'today' | 'weekly'>('today')
  const [hours, setHours] = useState<HourRow[] | null>(null)
  const [breaks, setBreaks] = useState<BreakRow[]>([])
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  // Today's quick block form
  const [blockReason, setBlockReason] = useState('On Break')
  const [blockStart, setBlockStart] = useState('')
  const [blockEnd, setBlockEnd] = useState('')
  const [showBlockForm, setShowBlockForm] = useState(false)

  // Fetch shop data (hours + breaks)
  const { data: shopData } = useQuery({
    queryKey: ['owner-shop'],
    queryFn: async () => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-shop-get`, {
        headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
      })
      const { data } = await res.json()
      return data
    },
  })

  // Fetch today's blocks
  const today = todayStr()
  const { data: todayBlocks } = useQuery({
    queryKey: ['owner-blocks', today],
    queryFn: async () => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-blocks-manage?from=${today}&to=${today}`, {
        headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
      })
      const { data } = await res.json()
      return (data ?? []) as SlotBlock[]
    },
  })

  // Populate hours + breaks from fetched data
  useEffect(() => {
    if (shopData && !initialized.current) {
      initialized.current = true
      const filled = makeDefaults()
      for (const h of (shopData?.hours ?? [])) {
        const idx = filled.findIndex((f: HourRow) => f.day_of_week === h.day_of_week)
        if (idx >= 0) filled[idx] = { day_of_week: h.day_of_week, open_time: h.open_time, close_time: h.close_time, is_closed: h.is_closed }
      }
      setHours(filled)
      setBreaks((shopData?.breaks ?? []).map((b: any) => ({
        day_of_week: b.day_of_week,
        start_time: b.start_time,
        end_time: b.end_time,
        label: b.label ?? 'Break',
      })))
    }
  }, [shopData])

  // Save weekly hours + breaks
  const saveMutation = useMutation({
    mutationFn: async ({ h, b }: { h: HourRow[]; b: BreakRow[] }) => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-shop-hours-update`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', apikey: ANON_KEY },
        body: JSON.stringify({ hours: h, breaks: b }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-shop'] })
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    },
    onError: (e: Error) => setErr(e.message),
  })

  // Add a block for today (quick break / early close)
  const addBlockMutation = useMutation({
    mutationFn: async (block: { start_time: string; end_time: string; reason: string }) => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-blocks-manage`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', apikey: ANON_KEY },
        body: JSON.stringify({ block_date: today, ...block }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-blocks', today] })
      setShowBlockForm(false); setBlockStart(''); setBlockEnd(''); setBlockReason('On Break')
    },
    onError: (e: Error) => setErr(e.message),
  })

  // Remove a block
  const removeBlockMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-blocks-manage?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner-blocks', today] }),
  })

  function updateHour(day: number, field: keyof HourRow, value: any) {
    setHours(prev => prev!.map(h => h.day_of_week === day ? { ...h, [field]: value } : h))
  }

  function addBreak() {
    setBreaks(prev => [...prev, { day_of_week: null, start_time: '13:00', end_time: '14:00', label: 'Lunch Break' }])
  }

  function updateBreak(i: number, field: keyof BreakRow, value: any) {
    setBreaks(prev => prev.map((b, idx) => idx === i ? { ...b, [field]: value } : b))
  }

  function removeBreak(i: number) {
    setBreaks(prev => prev.filter((_, idx) => idx !== i))
  }

  function handleQuickBreak() {
    const now = nowTime()
    // Round up to next 30 min
    const mins = parseInt(now.split(':')[1])
    const hrs = parseInt(now.split(':')[0])
    const startMins = mins < 30 ? 30 : 0
    const startHrs = mins < 30 ? hrs : hrs + 1
    const start = `${String(startHrs).padStart(2, '0')}:${String(startMins).padStart(2, '0')}`
    const endHrs = startMins === 30 ? startHrs + 1 : startHrs
    const endMins = startMins === 30 ? 0 : 30
    const end = `${String(endHrs).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
    setBlockStart(start); setBlockEnd(end); setBlockReason('On Break'); setShowBlockForm(true)
  }

  function handleEarlyClose() {
    const now = nowTime()
    const todayDow = new Date().getDay()
    const todayHours = hours?.find(h => h.day_of_week === todayDow)
    if (!todayHours) return
    // Round up current time to next 30-min
    const mins = parseInt(now.split(':')[1])
    const hrs = parseInt(now.split(':')[0])
    const startMins = mins < 30 ? 30 : 0
    const startHrs = mins < 30 ? hrs : hrs + 1
    const start = `${String(startHrs).padStart(2, '0')}:${String(startMins).padStart(2, '0')}`
    setBlockStart(start); setBlockEnd(todayHours.close_time); setBlockReason('Closed Early'); setShowBlockForm(true)
  }

  const todayDow = new Date().getDay()
  const todayHours = hours?.find(h => h.day_of_week === todayDow)
  const activeBlocks = todayBlocks ?? []

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-syne text-2xl font-bold text-saloo-dark">Availability</h1>
        <p className="text-saloo-dark/50 text-sm mt-0.5">Manage your shop hours & breaks</p>
      </div>

      {err && <p className="text-red-400 text-sm bg-red-400/5 border border-red-400/20 rounded-lg px-3 py-2">{err}</p>}

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('today')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'today' ? 'bg-saloo-pink text-saloo-cream' : 'bg-white/60 text-saloo-dark/60 hover:bg-white/80'}`}>
          Today
        </button>
        <button onClick={() => setTab('weekly')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'weekly' ? 'bg-saloo-pink text-saloo-cream' : 'bg-white/60 text-saloo-dark/60 hover:bg-white/80'}`}>
          Weekly Schedule
        </button>
      </div>

      {/* ═══ TODAY TAB ═══ */}
      {tab === 'today' && (
        <div className="space-y-4">
          {/* Today's status */}
          <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-syne font-bold text-saloo-dark text-base">{DAYS[todayDow]}, Today</h2>
              {todayHours && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${todayHours.is_closed ? 'bg-red-400/10 text-red-400' : 'bg-green-400/10 text-green-400'}`}>
                  {todayHours.is_closed ? 'Closed' : 'Open'}
                </span>
              )}
            </div>
            {todayHours && !todayHours.is_closed && (
              <p className="text-saloo-dark/50 text-sm">{todayHours.open_time} – {todayHours.close_time}</p>
            )}
          </div>

          {/* Quick actions */}
          {todayHours && !todayHours.is_closed && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleQuickBreak}
                className="bg-amber-400/10 border border-amber-400/20 text-amber-600 rounded-xl px-4 py-3 text-sm font-semibold hover:bg-amber-400/20 transition-all">
                ☕ Take a Break
              </button>
              <button onClick={handleEarlyClose}
                className="bg-red-400/10 border border-red-400/20 text-red-400 rounded-xl px-4 py-3 text-sm font-semibold hover:bg-red-400/20 transition-all">
                🔒 Close Early
              </button>
            </div>
          )}

          {/* Block form */}
          {showBlockForm && (
            <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-5 space-y-4">
              <h3 className="font-syne font-bold text-saloo-dark text-sm">Block Time Slot</h3>
              <div>
                <label className="text-saloo-dark/50 text-xs uppercase tracking-wider block mb-1.5">Reason</label>
                <input value={blockReason} onChange={e => setBlockReason(e.target.value)}
                  className="w-full bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-saloo-dark text-sm focus:outline-none focus:border-saloo-pink/40" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-saloo-dark/50 text-xs uppercase tracking-wider block mb-1.5">From</label>
                  <input type="time" value={blockStart} onChange={e => setBlockStart(e.target.value)}
                    className="w-full bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-saloo-dark text-sm focus:outline-none focus:border-saloo-pink/40" />
                </div>
                <div>
                  <label className="text-saloo-dark/50 text-xs uppercase tracking-wider block mb-1.5">To</label>
                  <input type="time" value={blockEnd} onChange={e => setBlockEnd(e.target.value)}
                    className="w-full bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-saloo-dark text-sm focus:outline-none focus:border-saloo-pink/40" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => {
                  if (!blockStart || !blockEnd) { setErr('Select start and end time'); return }
                  addBlockMutation.mutate({ start_time: blockStart, end_time: blockEnd, reason: blockReason })
                }} disabled={addBlockMutation.isPending}
                  className="flex-1 py-2.5 bg-saloo-pink text-saloo-cream rounded-xl font-syne font-bold text-sm hover:bg-saloo-pink/90 disabled:opacity-40 transition-all">
                  {addBlockMutation.isPending ? 'Blocking…' : 'Confirm Block'}
                </button>
                <button onClick={() => setShowBlockForm(false)}
                  className="px-4 py-2.5 bg-white/60 text-saloo-dark/50 rounded-xl text-sm hover:text-saloo-dark/70 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Active blocks for today */}
          {activeBlocks.length > 0 && (
            <div className="space-y-2">
              <p className="text-saloo-dark/50 text-xs uppercase tracking-widest">Active Blocks Today</p>
              {activeBlocks.map((b: SlotBlock) => (
                <div key={b.id} className="bg-red-400/5 border border-red-400/15 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-saloo-dark font-medium text-sm">{b.reason || 'Blocked'}</p>
                    <p className="text-saloo-dark/50 text-xs mt-0.5">{b.start_time} – {b.end_time}</p>
                  </div>
                  <button onClick={() => removeBlockMutation.mutate(b.id)}
                    disabled={removeBlockMutation.isPending}
                    className="px-3 py-1.5 bg-white/60 text-saloo-dark/60 hover:text-green-500 rounded-lg text-xs font-medium transition-all disabled:opacity-40">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeBlocks.length === 0 && todayHours && !todayHours.is_closed && !showBlockForm && (
            <div className="text-center py-8 text-saloo-dark/30 text-sm">
              No blocks for today — shop is running normally
            </div>
          )}
        </div>
      )}

      {/* ═══ WEEKLY TAB ═══ */}
      {tab === 'weekly' && (
        <div className="space-y-6">
          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={() => hours && saveMutation.mutate({ h: hours, b: breaks })}
              disabled={saveMutation.isPending || !hours}
              className={`px-5 py-2.5 rounded-xl font-syne font-bold text-sm transition-all disabled:opacity-40 ${saved ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-saloo-pink text-saloo-cream hover:bg-saloo-pink/90'}`}
            >
              {saveMutation.isPending ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
            </button>
          </div>

          {/* Weekly hours */}
          {!hours ? (
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-16 bg-white/60 border border-white/80 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-saloo-dark/50 text-xs uppercase tracking-widest">Shop Hours</p>
              {hours.map(h => (
                <div key={h.day_of_week} className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`font-semibold text-sm ${h.is_closed ? 'text-saloo-dark/40' : 'text-saloo-dark'}`}>{DAYS[h.day_of_week]}</span>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <span className="text-saloo-dark/50 text-xs">{h.is_closed ? 'Closed' : 'Open'}</span>
                      <div
                        onClick={() => updateHour(h.day_of_week, 'is_closed', !h.is_closed)}
                        className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${h.is_closed ? 'bg-white/80' : 'bg-saloo-pink'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${h.is_closed ? 'translate-x-0.5' : 'translate-x-5'}`} />
                      </div>
                    </label>
                  </div>
                  {!h.is_closed && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-saloo-dark/50 text-xs mb-1.5">Opens</p>
                        <select value={h.open_time} onChange={e => updateHour(h.day_of_week, 'open_time', e.target.value)}
                          className="w-full bg-white/60 border border-white/80 rounded-lg px-3 py-2 text-saloo-dark text-sm focus:outline-none focus:border-saloo-pink/40">
                          {OPEN_HOURS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="text-saloo-dark/50 text-xs mb-1.5">Closes</p>
                        <select value={h.close_time} onChange={e => updateHour(h.day_of_week, 'close_time', e.target.value)}
                          className="w-full bg-white/60 border border-white/80 rounded-lg px-3 py-2 text-saloo-dark text-sm focus:outline-none focus:border-saloo-pink/40">
                          {CLOSE_HOURS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Recurring breaks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-saloo-dark/50 text-xs uppercase tracking-widest">Recurring Breaks</p>
              <button onClick={addBreak}
                className="text-saloo-pink text-xs font-semibold hover:text-saloo-pink/80 transition-colors">
                + Add Break
              </button>
            </div>
            {breaks.length === 0 && (
              <div className="text-center py-6 text-saloo-dark/30 text-sm">No recurring breaks set</div>
            )}
            {breaks.map((b, i) => (
              <div key={i} className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <input value={b.label} onChange={e => updateBreak(i, 'label', e.target.value)} placeholder="Break name"
                    className="bg-transparent text-saloo-dark font-medium text-sm focus:outline-none border-b border-transparent focus:border-saloo-pink/40 pb-0.5" />
                  <button onClick={() => removeBreak(i)} className="text-red-400/60 hover:text-red-400 text-xs transition-colors">Remove</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-saloo-dark/50 text-xs mb-1.5">Day</p>
                    <select value={b.day_of_week ?? 'all'} onChange={e => updateBreak(i, 'day_of_week', e.target.value === 'all' ? null : parseInt(e.target.value))}
                      className="w-full bg-white/60 border border-white/80 rounded-lg px-3 py-2 text-saloo-dark text-sm focus:outline-none focus:border-saloo-pink/40">
                      <option value="all">Every day</option>
                      {DAYS.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-saloo-dark/50 text-xs mb-1.5">From</p>
                    <select value={b.start_time} onChange={e => updateBreak(i, 'start_time', e.target.value)}
                      className="w-full bg-white/60 border border-white/80 rounded-lg px-3 py-2 text-saloo-dark text-sm focus:outline-none focus:border-saloo-pink/40">
                      {BREAK_STARTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-saloo-dark/50 text-xs mb-1.5">To</p>
                    <select value={b.end_time} onChange={e => updateBreak(i, 'end_time', e.target.value)}
                      className="w-full bg-white/60 border border-white/80 rounded-lg px-3 py-2 text-saloo-dark text-sm focus:outline-none focus:border-saloo-pink/40">
                      {BREAK_ENDS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
