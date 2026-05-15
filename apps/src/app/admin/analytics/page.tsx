'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL

async function fetchAnalytics(token: string, period: string) {
  const res = await fetch(`${BASE}/functions/v1/admin-analytics-get?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const { data } = await res.json()
  return data
}

const PERIODS = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
]

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white/60 backdrop-blur-md shadow-sm rounded-2xl p-5 border border-white/80">
      <p className="text-saloo-dark/60 text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="text-saloo-dark text-2xl font-bold mt-1" style={{ fontFamily: 'Syne, sans-serif' }}>{value}</p>
      {sub && <p className="text-saloo-dark/50 text-xs mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const supabase = createClient()

  const { data } = useQuery({
    queryKey: ['admin-analytics', period],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      return fetchAnalytics(session!.access_token, period)
    },
  })

  const fmt = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n}`
  const d = data

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-saloo-dark text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Platform Analytics</h1>
          <p className="text-saloo-dark/60 text-sm mt-1">Marketplace performance overview</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                period === p.key ? 'bg-saloo-admin text-white shadow-md' : 'text-saloo-dark/60 hover:text-saloo-dark/70'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={d ? fmt(d.total_revenue) : '—'} sub={`Avg ₹${d?.avg_booking_value ?? 0}/booking`} />
        <StatCard label="Total Bookings" value={d?.total_bookings ?? '—'} sub={`${d?.platform_completion_rate ?? 0}% completed`} />
        <StatCard label="New Users" value={d?.total_new_users ?? '—'} />
        <StatCard label="New Shops" value={d?.total_new_shops ?? '—'} />
      </div>

      {/* Revenue chart (bar chart using CSS) */}
      {d?.revenue_by_day && (
        <div className="bg-white/60 backdrop-blur-md shadow-sm rounded-2xl p-5 border border-white/80">
          <h2 className="text-saloo-dark/80 text-xs font-medium uppercase tracking-wide mb-4">Revenue by Day</h2>
          <div className="flex items-end gap-1 h-32">
            {(() => {
              const maxRevenue = Math.max(...d.revenue_by_day.map((r: any) => r.revenue), 1)
              const items = period === '7d' ? d.revenue_by_day : d.revenue_by_day.slice(-14)
              return items.map((r: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className="w-full bg-red-400/40 rounded-t group-hover:bg-red-400/60 transition-colors"
                    style={{ height: `${Math.max(4, (r.revenue / maxRevenue) * 100)}%` }}
                    title={`${r.date}: ₹${r.revenue}`}
                  />
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {/* Status breakdown + Top cities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Booking status */}
        <div className="bg-white/60 backdrop-blur-md shadow-sm rounded-2xl p-5 border border-white/80">
          <h2 className="text-saloo-dark/80 text-xs font-medium uppercase tracking-wide mb-4">Bookings by Status</h2>
          <div className="space-y-2">
            {(d?.bookings_by_status ?? []).map((s: any) => (
              <div key={s.status} className="flex justify-between text-sm">
                <span className="text-saloo-dark/80 capitalize">{s.status}</span>
                <span className="text-saloo-dark/90 font-medium">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top cities */}
        <div className="bg-white/60 backdrop-blur-md shadow-sm rounded-2xl p-5 border border-white/80">
          <h2 className="text-saloo-dark/80 text-xs font-medium uppercase tracking-wide mb-4">Top Cities</h2>
          <div className="space-y-2">
            {(d?.top_cities ?? []).map((c: any) => (
              <div key={c.city} className="flex justify-between text-sm">
                <span className="text-saloo-dark/80">{c.city}</span>
                <span className="text-saloo-dark/90 font-medium">{c.bookings} bookings</span>
              </div>
            ))}
            {(d?.top_cities ?? []).length === 0 && <p className="text-saloo-dark/50 text-sm">No data yet</p>}
          </div>
        </div>
      </div>

      {/* Top shops */}
      {(d?.top_shops ?? []).length > 0 && (
        <div className="bg-white/60 backdrop-blur-md shadow-sm rounded-2xl p-5 border border-white/80">
          <h2 className="text-saloo-dark/80 text-xs font-medium uppercase tracking-wide mb-4">Top Performing Shops</h2>
          <div className="space-y-2">
            {d.top_shops.map((s: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-saloo-dark/50 text-xs w-4">{i + 1}</span>
                  <span className="text-saloo-dark/90">{s.name}</span>
                </div>
                <div className="flex gap-4 text-saloo-dark/60 text-xs">
                  <span>⭐ {s.rating?.toFixed(1)}</span>
                  <span>{s.bookings} bookings</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
