'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { formatDate, formatTime } from '@saloo/lib'

type Tab = 'upcoming' | 'past' | 'cancelled'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending_confirmation: { label: '⏳ Awaiting Confirmation', color: '#C2410C', bg: '#FFF7ED' },
  confirmed:       { label: 'Confirmed',  color: '#15803D', bg: '#DCFCE7' },
  in_chair:        { label: 'In Chair',   color: '#854D0E', bg: '#FEF9C3' },
  completed:       { label: 'Completed',  color: '#15803D', bg: '#DCFCE7' },
  no_show:         { label: 'No Show',    color: '#B91C1C', bg: '#FEE2E2' },
  cancelled:       { label: 'Cancelled',  color: '#B91C1C', bg: '#FEE2E2' },
  disputed:        { label: 'Disputed',   color: '#854D0E', bg: '#FEF9C3' },
  pending_payment: { label: 'Pending',    color: '#854D0E', bg: '#FEF9C3' },
}

async function fetchBookings(filter: Tab) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(
    `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/bookings-list?filter=${filter}&limit=20`,
    { headers: { Authorization: `Bearer ${session?.access_token}` } }
  )
  const json = await res.json()
  return json.data ?? []
}

export default function BookingsPage() {
  const [tab, setTab] = useState<Tab>('upcoming')

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings', tab],
    queryFn: () => fetchBookings(tab),
  })

  return (
    <div className="space-y-5 pb-4">

      {/* Header */}
      <div>
        <h1 className="font-syne text-2xl font-bold text-navy">My Bookings</h1>
        <p className="text-muted text-sm mt-0.5">Track your appointments</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-lavender rounded-xl p-1">
        {(['upcoming', 'past', 'cancelled'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
              tab === t
                ? 'bg-white text-navy shadow-sm'
                : 'text-muted hover:text-secondary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-2xl p-5 animate-pulse space-y-3">
              <div className="h-4 bg-lavender rounded-lg w-3/4" />
              <div className="h-3 bg-lavender rounded-lg w-1/2" />
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-white border border-border rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-lavender flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-navy" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <p className="font-syne font-bold text-navy text-lg">No {tab} bookings</p>
          <p className="text-muted text-sm mt-1">Your appointments will appear here</p>
          {tab === 'upcoming' && (
            <Link href="/search" className="inline-flex items-center gap-2 bg-saloo-teal text-navy font-syne font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-saloo-teal/90 transition-colors mt-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Book Now
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b: any) => {
            const shop = Array.isArray(b.shop) ? b.shop[0] : b.shop
            const cfg = STATUS_CONFIG[b.status] ?? { label: b.status, color: '#5C5380', bg: '#EDE8FA' }
            return (
              <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="block bg-white border border-border rounded-2xl p-4 sm:p-5 hover:border-saloo-teal/40 hover:shadow-royal transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-lavender flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-navy" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 11-5.196 3 3 3 0 015.196-3zm1.536-.887a2.165 2.165 0 001.083-1.838c.005-.352.054-.696.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.323 4.323 0 012.068-1.379l5.325-1.628a4.5 4.5 0 012.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.331 4.331 0 0010.607 12m3.736 0l7.794 4.5-.802.215a4.5 4.5 0 01-2.48-.043l-5.326-1.629a4.324 4.324 0 01-2.068-1.379M14.343 12l-2.882 1.664" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-syne font-bold text-navy truncate">{shop?.name}</p>
                      <p className="text-sm text-muted mt-0.5">
                        {formatDate(b.date)} · {formatTime(b.start_time)}
                      </p>
                      <p className="text-[11px] text-muted/60 mt-1 font-mono">{b.booking_ref}</p>
                    </div>
                  </div>
                  <span
                    className="text-xs px-2.5 py-1 rounded-pill font-semibold shrink-0"
                    style={{ color: cfg.color, backgroundColor: cfg.bg }}
                  >
                    {cfg.label}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
