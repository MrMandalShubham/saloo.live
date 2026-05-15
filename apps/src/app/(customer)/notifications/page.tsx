'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { relativeTime } from '@saloo/lib'

const FILTERS = ['all', 'booking', 'payment', 'loyalty', 'promo'] as const
type Filter = typeof FILTERS[number]

async function fetchNotifications(filter: Filter) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const params = new URLSearchParams({ ...(filter !== 'all' && { type: filter }), limit: '30' })
  const res = await fetch(
    `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/notifications-list?${params}`,
    { headers: { Authorization: `Bearer ${session?.access_token}` } }
  )
  const json = await res.json()
  const result = json.data ?? {}
  return { notifications: result.notifications ?? [], unread_count: result.unread_count ?? 0 }
}

async function markAllRead() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  await fetch(
    `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/notifications-read`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_all: true }),
    }
  )
}

const TYPE_ICON: Record<string, string> = {
  booking_confirmed: '✓',
  booking_cancelled: '✕',
  booking_reminder:  '⏰',
  payment_received:  '💰',
  refund_processed:  '↩',
  loyalty_earned:    '✦',
  promo:             '🎁',
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const queryClient = useQueryClient()

  const { data = { notifications: [], unread_count: 0 }, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => fetchNotifications(filter),
  })

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <div className="space-y-5 pb-4 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-syne text-2xl font-bold text-navy">Notifications</h1>
          {data.unread_count > 0 && (
            <span className="bg-saloo-teal text-navy text-xs font-bold w-5 h-5 inline-flex items-center justify-center rounded-full">
              {data.unread_count}
            </span>
          )}
        </div>
        {data.unread_count > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="text-sm text-saloo-teal font-semibold hover:text-saloo-teal/80 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-4 py-1.5 rounded-pill text-xs font-semibold border transition-all capitalize ${
              filter === f
                ? 'bg-navy text-white border-navy'
                : 'bg-white border-border text-secondary hover:border-navy/40 hover:text-navy'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-2xl p-4 animate-pulse flex gap-3">
              <div className="w-10 h-10 bg-lavender rounded-xl shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="h-3 bg-lavender rounded-lg w-3/4" />
                <div className="h-3 bg-lavender rounded-lg w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : data.notifications.length === 0 ? (
        <div className="text-center py-16 bg-white border border-border rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-lavender flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-navy" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <p className="font-syne font-bold text-navy text-lg">No notifications yet</p>
          <p className="text-muted text-sm mt-1">We'll notify you about bookings and offers</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.notifications.map((n: any) => (
            <div
              key={n.id}
              className={`bg-white border rounded-2xl p-4 flex gap-3 transition-all ${
                !n.is_read ? 'border-saloo-teal/40 bg-saloo-teal/[0.02]' : 'border-border'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!n.is_read ? 'bg-saloo-teal/10' : 'bg-lavender'}`}>
                <span className={`font-syne text-sm ${!n.is_read ? 'text-saloo-teal' : 'text-navy'}`}>
                  {TYPE_ICON[n.type] ?? '◎'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-navy' : 'text-secondary'}`}>
                  {n.title}
                </p>
                <p className="text-sm text-muted mt-0.5 leading-snug">{n.body}</p>
                <p className="text-[11px] text-muted/60 mt-1.5">{relativeTime(n.created_at)}</p>
              </div>
              {!n.is_read && (
                <div className="w-2 h-2 rounded-full bg-saloo-teal mt-2 shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
