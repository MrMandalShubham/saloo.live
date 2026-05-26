'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const STATUS_COLOR: Record<string, string> = {
  pending_confirmation: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  pending:   'text-amber-400 bg-amber-400/10 border-amber-400/20',
  confirmed: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  in_chair:  'text-purple-400 bg-purple-400/10 border-purple-400/20',
  completed: 'text-green-400 bg-green-400/10 border-green-400/20',
  no_show:   'text-red-400 bg-red-400/10 border-red-400/20',
  cancelled: 'text-saloo-dark/50 bg-white/5 border-white/80',
}
const STATUS_LABEL: Record<string, string> = {
  pending_confirmation: '⏳ Needs Confirm', pending: 'Pending', confirmed: 'Confirmed', in_chair: 'In Chair',
  completed: 'Done', no_show: 'No Show', cancelled: 'Cancelled',
}
const TABS = [
  { key: 'today',    label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past',     label: 'Past' },
  { key: 'pending_confirmation',  label: '⏳ Pending' },
]

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

export default function OwnerBookingsPage() {
  const [activeTab, setActiveTab] = useState('today')
  const [updating, setUpdating] = useState<string | null>(null)
  const supabase = createClient()
  const queryClient = useQueryClient()

  const handleStatusUpdate = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    setUpdating(bookingId + status)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-bookings-update/${bookingId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session!.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['owner-bookings'] })
      }
    } catch {}
    setUpdating(null)
  }

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
        <h1 className="font-syne text-2xl font-bold text-saloo-dark">Bookings</h1>
        <p className="text-saloo-dark/50 text-sm mt-0.5">Manage your appointment queue</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl p-1 gap-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === t.key ? 'bg-saloo-pink text-saloo-cream' : 'text-saloo-dark/60 hover:text-saloo-dark'
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
            <div key={i} className="h-20 bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (bookings ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/60 backdrop-blur-md shadow-sm border border-white/80 flex items-center justify-center mb-3">
            <span className="text-saloo-dark/40 text-xl">◈</span>
          </div>
          <p className="text-saloo-dark/50 text-sm">No bookings</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(bookings ?? []).map((b: any) => (
            <Link key={b.id} href={`/owner/bookings/${b.id}`}
              className="bg-white/60 backdrop-blur-md shadow-sm hover:bg-white/70 backdrop-blur-md shadow-sm border border-white/80 rounded-xl p-4 flex items-start justify-between transition-all group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-saloo-dark font-semibold text-sm font-syne">{b.booking_ref}</span>
                  <span className="text-saloo-dark/50 text-xs">{b.date} · {b.start_time}</span>
                </div>
                <p className="text-saloo-dark/70 text-sm truncate">{b.customer?.name ?? 'Guest'} · {b.service_names?.join(', ')}</p>
                {b.barber && <p className="text-saloo-dark/50 text-xs mt-0.5">{b.barber.name}</p>}
              </div>
              <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[b.status] ?? 'text-saloo-dark/50 bg-white/5 border-white/80'}`}>
                  {STATUS_LABEL[b.status] ?? b.status}
                </span>
                {b.has_dispute && <span className="text-red-400 text-xs">Dispute</span>}
                {b.status === 'pending_confirmation' && (
                  <div className="flex gap-1.5 mt-1" onClick={e => e.preventDefault()}>
                    <button
                      onClick={() => handleStatusUpdate(b.id, 'confirmed')}
                      disabled={!!updating}
                      className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      {updating === b.id + 'confirmed' ? '...' : '✓ Confirm'}
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(b.id, 'cancelled')}
                      disabled={!!updating}
                      className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {updating === b.id + 'cancelled' ? '...' : '✕ Reject'}
                    </button>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
