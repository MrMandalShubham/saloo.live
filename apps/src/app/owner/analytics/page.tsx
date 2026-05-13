'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@saloo/lib'

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const PERIODS = [{ key: '7d', label: '7 Days' }, { key: '30d', label: '30 Days' }, { key: '90d', label: '90 Days' }]

export default function OwnerAnalyticsPage() {
  const [period, setPeriod] = useState('30d')

  const { data, isLoading } = useQuery({
    queryKey: ['owner-analytics', period],
    queryFn: async () => {
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-analytics-get?period=${period}`, {
        headers: { Authorization: `Bearer ${session!.access_token}` },
      })
      const { data } = await res.json()
      return data
    },
    staleTime: 1000 * 60 * 5,
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold text-white">Analytics</h1>
          <p className="text-white/30 text-sm mt-0.5">Performance overview</p>
        </div>
        <div className="flex bg-white/[0.05] border border-white/[0.08] rounded-xl p-1 gap-1">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p.key ? 'bg-gold text-navy' : 'text-white/40 hover:text-white'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 bg-white/[0.04] border border-white/[0.07] rounded-2xl animate-pulse" />)}
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Key metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Metric label="Total Revenue"    value={formatINR(data.total_revenue)}        sub={`${data.total_bookings} bookings`} accent />
            <Metric label="Avg Booking"      value={formatINR(data.avg_booking_value)}    sub={`★ ${data.avg_rating?.toFixed(1)} avg rating`} accent />
            <Metric label="New Customers"    value={String(data.new_customers)}           sub="first visit" />
            <Metric label="Returning"        value={String(data.repeat_customers)}        sub="came back" />
          </div>

          {/* Booking rates */}
          <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-5">Booking Rates</p>
            <div className="space-y-5">
              <RateBar label="Completion"  value={data.completion_rate}  color="bg-green-500" />
              <RateBar label="Cancellation" value={data.cancellation_rate} color="bg-gold" />
              <RateBar label="No-Show"     value={data.no_show_rate}     color="bg-red-500" />
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Top Services */}
            {data.top_services?.length > 0 && (
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
                <p className="text-white/30 text-xs uppercase tracking-widest mb-5">Top Services</p>
                <div className="space-y-3">
                  {data.top_services.map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-white/20 text-xs w-4 font-syne">{i + 1}</span>
                        <span className="text-white/70 text-sm">{s.name}</span>
                      </div>
                      <span className="text-gold text-sm font-semibold">{s.count}× · {formatINR(s.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Barbers */}
            {data.top_barbers?.length > 0 && (
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
                <p className="text-white/30 text-xs uppercase tracking-widest mb-5">Top Barbers</p>
                <div className="space-y-3">
                  {data.top_barbers.map((b: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-white/20 text-xs w-4 font-syne">{i + 1}</span>
                        <span className="text-white/70 text-sm">{b.name}</span>
                      </div>
                      <span className="text-gold text-sm font-semibold">{b.bookings} · ★ {b.rating?.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Revenue by day */}
          {data.revenue_by_day?.length > 0 && (
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
              <p className="text-white/30 text-xs uppercase tracking-widest mb-5">Daily Revenue</p>
              <div className="space-y-0 max-h-80 overflow-y-auto scrollbar-none">
                {data.revenue_by_day.slice(-14).reverse().map((d: any) => (
                  <div key={d.date} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
                    <span className="text-white/35 text-sm">{new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    <div className="flex items-center gap-5">
                      <span className="text-white/30 text-sm">{d.bookings} bookings</span>
                      <span className="text-gold font-semibold text-sm tabular-nums">{formatINR(d.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function Metric({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
      <p className="text-white/30 text-xs uppercase tracking-wider mb-3">{label}</p>
      <p className={`font-syne text-2xl font-bold ${accent ? 'text-gold' : 'text-white'}`}>{value}</p>
      <p className="text-white/25 text-xs mt-1.5">{sub}</p>
    </div>
  )
}

function RateBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-white/50 text-sm">{label}</span>
        <span className="text-white font-semibold text-sm tabular-nums">{value}%</span>
      </div>
      <div className="h-1.5 bg-white/[0.07] rounded-full">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  )
}
