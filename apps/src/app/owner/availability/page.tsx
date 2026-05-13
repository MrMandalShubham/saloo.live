'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const OPEN_HOURS  = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00']
const CLOSE_HOURS = ['17:00','18:00','19:00','20:00','21:00','22:00','23:00']

type HourRow = { day_of_week: number; open_time: string; close_time: string; is_closed: boolean }

function makeDefaults(): HourRow[] {
  return Array.from({ length: 7 }, (_, i) => ({ day_of_week: i, open_time: '09:00', close_time: '20:00', is_closed: i === 0 }))
}

export default function OwnerAvailabilityPage() {
  const qc = useQueryClient()
  const [hours, setHours] = useState<HourRow[] | null>(null)
  const [saved, setSaved] = useState(false)

  useQuery({
    queryKey: ['owner-shop'],
    queryFn: async () => {
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-shop-get`, { headers: { Authorization: `Bearer ${session!.access_token}` } })
      const { data } = await res.json()
      return data
    },
    onSuccess: (data: any) => {
      if (!hours) {
        const filled = makeDefaults()
        for (const h of (data?.hours ?? [])) {
          const idx = filled.findIndex(f => f.day_of_week === h.day_of_week)
          if (idx >= 0) filled[idx] = { ...h }
        }
        setHours(filled)
      }
    },
  } as any)

  const saveMutation = useMutation({
    mutationFn: async (h: HourRow[]) => {
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-shop-hours-update`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session!.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: h, breaks: [] }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner-shop'] }); setSaved(true); setTimeout(() => setSaved(false), 3000) },
  })

  function update(day: number, field: keyof HourRow, value: any) {
    setHours(prev => prev!.map(h => h.day_of_week === day ? { ...h, [field]: value } : h))
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-white">Availability</h1>
          <p className="text-white/30 text-sm mt-0.5">Set your shop's opening hours</p>
        </div>
        <button
          onClick={() => hours && saveMutation.mutate(hours)}
          disabled={saveMutation.isPending || !hours}
          className={`px-5 py-2.5 rounded-xl font-syne font-bold text-sm transition-all disabled:opacity-40 ${
            saved ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-gold text-navy hover:bg-gold/90'
          }`}
        >
          {saveMutation.isPending ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>

      {/* Hours */}
      {!hours ? (
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-16 bg-white/[0.04] border border-white/[0.07] rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {hours.map(h => (
            <div key={h.day_of_week} className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <span className={`font-semibold text-sm ${h.is_closed ? 'text-white/30' : 'text-white'}`}>{DAYS[h.day_of_week]}</span>
                {/* Toggle */}
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <span className="text-white/25 text-xs">{h.is_closed ? 'Closed' : 'Open'}</span>
                  <div
                    onClick={() => update(h.day_of_week, 'is_closed', !h.is_closed)}
                    className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${h.is_closed ? 'bg-white/10' : 'bg-gold'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${h.is_closed ? 'translate-x-0.5' : 'translate-x-5'}`} />
                  </div>
                </label>
              </div>
              {!h.is_closed && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-white/25 text-xs mb-1.5">Opens</p>
                    <select value={h.open_time} onChange={e => update(h.day_of_week, 'open_time', e.target.value)}
                      className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/40">
                      {OPEN_HOURS.map(t => <option key={t} value={t} className="bg-navy">{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-white/25 text-xs mb-1.5">Closes</p>
                    <select value={h.close_time} onChange={e => update(h.day_of_week, 'close_time', e.target.value)}
                      className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/40">
                      {CLOSE_HOURS.map(t => <option key={t} value={t} className="bg-navy">{t}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
