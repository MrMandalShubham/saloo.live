'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const STATUS_COLOR: Record<string, string> = {
  pending:   'text-amber-400 bg-amber-400/10 border-amber-400/20',
  confirmed: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  in_chair:  'text-purple-400 bg-purple-400/10 border-purple-400/20',
  completed: 'text-green-400 bg-green-400/10 border-green-400/20',
  no_show:   'text-red-400 bg-red-400/10 border-red-400/20',
  cancelled: 'text-white/30 bg-white/5 border-white/10',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', in_chair: 'In Chair',
  completed: 'Done', no_show: 'No Show', cancelled: 'Cancelled',
}
const TABS = [
  { key: 'today',    label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past',     label: 'Past' },
  { key: 'pending',  label: 'Pending' },
]

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

export default function OwnerBookingsPage() {
  const [activeTab, setActiveTab] = useState('today')
  const supabase = createClient()

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['owner-bookings', activeTab],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-bookings-list?status=${activeTab}&limit=50`, {
        headers: { Authorization: `Bearer ${session!.access_token}` },
      })
      const { data } = await res.json()
      return data ?? []
    },
    staleTime: 30 * 1000,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-syne text-2xl font-bold text-white">Bookings</h1>
        <p className="text-white/30 text-sm mt-0.5">Manage your appointment queue</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/[0.05] border border-white/[0.08] rounded-xl p-1 gap-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === t.key ? 'bg-gold text-navy' : 'text-white/40 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white/[0.04] border border-white/[0.07] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (bookings ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mb-3">
            <span className="text-white/20 text-xl">◈</span>
          </div>
          <p className="text-white/25 text-sm">No bookings</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(bookings ?? []).map((b: any) => (
            <Link key={b.id} href={`/owner/bookings/${b.id}`}
              className="bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl p-4 flex items-start justify-between transition-all group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-white font-semibold text-sm font-syne">{b.booking_ref}</span>
                  <span className="text-white/30 text-xs">{b.date} · {b.start_time}</span>
                </div>
                <p className="text-white/55 text-sm truncate">{b.customer?.name ?? 'Guest'} · {b.service_names?.join(', ')}</p>
                {b.barber && <p className="text-white/25 text-xs mt-0.5">{b.barber.name}</p>}
              </div>
              <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[b.status] ?? 'text-white/30 bg-white/5 border-white/10'}`}>
                  {STATUS_LABEL[b.status] ?? b.status}
                </span>
                {b.has_dispute && <span className="text-red-400 text-xs">Dispute</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
