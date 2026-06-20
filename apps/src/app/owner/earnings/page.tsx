'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@saloo/lib'

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL

async function token() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

const PERIODS = [{ k: '7d', l: '7 days' }, { k: '30d', l: '30 days' }, { k: '90d', l: '90 days' }]

export default function OwnerEarningsPage() {
  const [period, setPeriod] = useState('30d')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['owner-earnings', period],
    queryFn: async () => {
      const res = await fetch(`${BASE}/functions/v1/owner-earnings-get?period=${period}`, {
        headers: { Authorization: `Bearer ${await token()}` },
      })
      return (await res.json()).data
    },
  })

  const setCommission = useMutation({
    mutationFn: async ({ barberId, rate }: { barberId: string; rate: number }) => {
      const res = await fetch(`${BASE}/functions/v1/owner-team-update/${barberId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_rate: rate }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
      return json.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner-earnings', period] }),
    onError: (e: Error) => alert(e.message),
  })

  const rows = data?.barbers ?? []
  const totals = data?.totals ?? { revenue: 0, commission: 0, tips: 0, payable: 0, shop_keep: 0 }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-saloo-dark">Barber Earnings</h1>
          <p className="text-saloo-dark/50 text-sm mt-0.5">Commission + tips payable to your team</p>
        </div>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 bg-white/60 backdrop-blur-md border border-white/80 rounded-xl p-1 w-fit">
        {PERIODS.map(p => (
          <button key={p.k} onClick={() => setPeriod(p.k)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${period === p.k ? 'bg-saloo-pink text-white' : 'text-saloo-dark/60 hover:text-saloo-dark'}`}>
            {p.l}
          </button>
        ))}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Service Revenue', value: formatINR(totals.revenue), color: 'text-saloo-dark' },
          { label: 'Total Payable', value: formatINR(totals.payable), color: 'text-saloo-pink' },
          { label: 'Tips', value: formatINR(totals.tips), color: 'text-green-600' },
          { label: 'Shop Keeps', value: formatINR(totals.shop_keep), color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-4">
            <p className="text-saloo-dark/50 text-[10px] uppercase tracking-widest font-bold mb-2">{s.label}</p>
            <p className={`font-syne text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Per-barber breakdown */}
      <div>
        <p className="text-saloo-dark/50 text-xs uppercase tracking-widest font-bold mb-3">By Barber</p>
        {isLoading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-24 bg-white/60 border border-white/80 rounded-2xl animate-pulse" />)}</div>
        ) : rows.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-10 text-center">
            <p className="text-saloo-dark/40 text-sm">No completed jobs in this period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r: any) => (
              <div key={r.barber_id} className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-semibold text-saloo-dark">{r.name}</p>
                      <p className="text-saloo-dark/40 text-xs">{r.jobs} job{r.jobs !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-saloo-dark/5 rounded-lg px-2 py-1">
                      <input
                        type="number" min={0} max={100}
                        defaultValue={r.commission_rate}
                        onBlur={e => {
                          const v = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                          if (v !== r.commission_rate) setCommission.mutate({ barberId: r.barber_id, rate: v })
                        }}
                        className="w-10 bg-transparent text-saloo-dark text-sm font-bold text-right focus:outline-none"
                      />
                      <span className="text-saloo-dark/40 text-xs font-bold">% comm.</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-syne font-bold text-saloo-pink text-xl">{formatINR(r.payable)}</p>
                    <p className="text-saloo-dark/40 text-[10px] uppercase tracking-widest font-bold">payable</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Mini label="Revenue" value={formatINR(r.revenue)} />
                  <Mini label={`Commission ${r.commission_rate}%`} value={formatINR(r.commission)} />
                  <Mini label="Tips" value={formatINR(r.tips)} />
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-saloo-dark/40 text-xs mt-3">Tap the % next to a barber to set their commission rate.</p>
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-saloo-dark/5 rounded-xl py-2.5">
      <p className="font-syne font-bold text-saloo-dark text-sm">{value}</p>
      <p className="text-saloo-dark/40 text-[9px] uppercase tracking-wider font-bold mt-0.5">{label}</p>
    </div>
  )
}
