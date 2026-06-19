'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatTime, next7Days } from '@saloo/lib'

const BASE = process.env['NEXT_PUBLIC_SUPABASE_URL']
const ANON = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''

async function getSession() {
  const { data: { session } } = await createClient().auth.getSession()
  return session
}

async function fetchBooking(id: string) {
  const session = await getSession()
  const res = await fetch(`${BASE}/functions/v1/bookings-get/${id}`, {
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
  })
  return (await res.json()).data
}

async function fetchAvailability(shopId: string, date: string, barberId?: string) {
  const session = await getSession()
  const params = new URLSearchParams({ date, ...(barberId && { barber_id: barberId }) })
  const res = await fetch(`${BASE}/functions/v1/shops-availability/${shopId}?${params}`, {
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, apikey: ANON },
  })
  const json = await res.json()
  return { slots: json.data?.slots ?? [], is_closed: json.data?.is_closed ?? false }
}

export default function ReschedulePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState<any>(null)
  const [err, setErr] = useState('')

  const { data: booking, isLoading } = useQuery({ queryKey: ['booking', id], queryFn: () => fetchBooking(id), enabled: !!id })

  const shop = booking ? (Array.isArray(booking.shop) ? booking.shop[0] : booking.shop) : null
  const barber = booking ? (Array.isArray(booking.barber) ? booking.barber[0] : booking.barber) : null

  const { data: availData, isLoading: slotsLoading } = useQuery({
    queryKey: ['availability', booking?.shop_id, date, booking?.barber_id],
    queryFn: () => fetchAvailability(booking.shop_id, date, booking.barber_id),
    enabled: !!booking?.shop_id && !!date,
  })
  const slots = availData?.slots ?? []
  const isDayClosed = availData?.is_closed ?? false

  const mutation = useMutation({
    mutationFn: async () => {
      const session = await getSession()
      const res = await fetch(`${BASE}/functions/v1/bookings-reschedule`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: id, date, start_time: slot.start_time }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
      return json.data
    },
    onSuccess: () => router.push(`/bookings/${id}`),
    onError: (e: Error) => setErr(e.message),
  })

  const days = next7Days()

  if (isLoading) {
    return <div className="max-w-2xl mx-auto py-6 space-y-4">{[1, 2].map(i => <div key={i} className="h-32 bg-white border border-border rounded-2xl animate-pulse" />)}</div>
  }
  if (!booking) return <div className="text-center py-20 text-muted">Booking not found</div>

  return (
    <div className="max-w-2xl mx-auto space-y-5 py-6 pb-24">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-2xl text-gray-400 hover:text-navy">‹</button>
        <h1 className="font-syne text-xl font-bold text-navy">Reschedule Booking</h1>
      </div>

      {/* Current */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <p className="text-xs text-muted uppercase tracking-widest font-bold mb-2">Current</p>
        <p className="font-syne font-bold text-navy">{shop?.name}</p>
        <p className="text-sm text-secondary mt-0.5">{booking.date} · {formatTime(booking.start_time)} · {barber?.name ?? 'Any barber'}</p>
        <p className="text-xs text-muted mt-1">No extra payment — your advance carries over.</p>
      </div>

      {err && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">{err}</div>}

      {/* New date & time */}
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-5">
        <h2 className="font-syne font-bold text-lg text-navy">Pick a New Time</h2>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {days.map((d: string) => {
            const dt = new Date(d)
            return (
              <button key={d} onClick={() => { setDate(d); setSlot(null) }}
                className={`shrink-0 flex flex-col items-center px-4 py-3 rounded-xl border font-medium transition-all ${
                  date === d ? 'bg-saloo-teal border-saloo-teal text-navy shadow-sm' : 'bg-white border-border text-gray-600 hover:border-saloo-teal/50'
                }`}>
                <span className="text-xs">{dt.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                <span className="text-lg font-syne font-bold">{dt.getDate()}</span>
                <span className="text-xs">{dt.toLocaleDateString('en-IN', { month: 'short' })}</span>
              </button>
            )
          })}
        </div>

        {date && (
          slotsLoading ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : slots.length === 0 ? (
            <p className="text-center text-muted text-sm py-6">{isDayClosed ? 'Shop is closed on this day' : 'No slots available'}</p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {slots.map((s: any) => {
                const available = s.is_available ?? s.available
                const isSel = slot?.start_time === s.start_time
                return (
                  <button key={s.start_time} disabled={!available} onClick={() => setSlot(s)}
                    className={`py-2.5 px-1 rounded-xl text-xs font-medium border transition-all ${
                      isSel ? 'bg-saloo-teal border-saloo-teal text-navy shadow-sm'
                        : !available ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed line-through'
                        : 'bg-white border-border text-gray-700 hover:border-saloo-teal/50'
                    }`}>
                    {formatTime(s.start_time)}
                  </button>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* Confirm */}
      <button
        onClick={() => mutation.mutate()}
        disabled={!date || !slot || mutation.isPending}
        className="w-full bg-saloo-teal text-navy font-syne font-bold py-4 rounded-2xl disabled:opacity-40 hover:bg-saloo-teal/90 transition-colors"
      >
        {mutation.isPending ? 'Rescheduling…' : 'Confirm New Time'}
      </button>
    </div>
  )
}
