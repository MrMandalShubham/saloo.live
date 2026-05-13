'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { formatINR, formatDate, formatTime } from '@saloo/lib'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  confirmed:       { label: 'Confirmed',  color: '#15803D', bg: '#DCFCE7', emoji: '✅' },
  in_chair:        { label: 'In Chair',   color: '#854D0E', bg: '#FEF9C3', emoji: '💈' },
  completed:       { label: 'Completed',  color: '#15803D', bg: '#DCFCE7', emoji: '✓' },
  no_show:         { label: 'No Show',    color: '#B91C1C', bg: '#FEE2E2', emoji: '⚠️' },
  cancelled:       { label: 'Cancelled',  color: '#B91C1C', bg: '#FEE2E2', emoji: '❌' },
  disputed:        { label: 'Disputed',   color: '#854D0E', bg: '#FEF9C3', emoji: '🛡️' },
  pending_payment: { label: 'Pending',    color: '#854D0E', bg: '#FEF9C3', emoji: '⏳' },
}

async function fetchBooking(id: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(
    `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/bookings-get/${id}`,
    { headers: { Authorization: `Bearer ${session?.access_token}` } }
  )
  const json = await res.json()
  return json.data
}

async function cancelBooking(id: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(
    `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/bookings-cancel/${id}/cancel`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }
  )
  return res.json()
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => fetchBooking(id),
    enabled: !!id,
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelBooking(id),
    onSuccess: (data) => {
      if (data.error) { alert(data.error.message); return }
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })

  const handleCancel = () => {
    if (!booking) return
    const apptTime = new Date(`${booking.date}T${booking.start_time}:00+05:30`)
    const hoursLeft = (apptTime.getTime() - Date.now()) / 3600000
    const msg = hoursLeft >= 2
      ? 'You will receive a full refund of your advance.'
      : 'You will receive 50% of your advance (cancellation within 2 hours).'

    if (confirm(`Cancel booking?\n\n${msg}`)) {
      cancelMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-card p-6 animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (!booking) return null

  const statusCfg = STATUS_CONFIG[booking.status] ?? { label: booking.status, color: '#6B7280', bg: '#F3F4F6', emoji: '?' }
  const shop = Array.isArray(booking.shop) ? booking.shop[0] : booking.shop
  const barber = Array.isArray(booking.barber) ? booking.barber[0] : booking.barber
  const canCancel = booking.status === 'confirmed'
  const canReview = booking.status === 'completed' && !booking.review
  const canDispute = ['completed', 'no_show'].includes(booking.status) && !booking.dispute

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => window.history.back()} className="text-2xl text-gray-400 hover:text-navy">‹</button>
        <h1 className="font-syne text-xl font-bold text-navy">Booking Details</h1>
      </div>

      {/* Status */}
      <div className="bg-white rounded-card p-6 text-center space-y-3">
        <p className="text-5xl">{statusCfg.emoji}</p>
        <span className="px-4 py-1.5 rounded-pill text-sm font-semibold" style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}>
          {statusCfg.label}
        </span>
        <p className="font-syne font-bold text-xl text-gold">{booking.booking_ref}</p>
      </div>

      {/* Shop & Appointment */}
      <div className="bg-white rounded-card p-6 space-y-4">
        {shop?.photos?.[0] && (
          <div className="relative h-36 rounded-xl overflow-hidden">
            <Image src={shop.photos[0]} alt={shop.name} fill className="object-cover" />
          </div>
        )}
        <h2 className="font-syne font-bold text-xl text-navy">{shop?.name}</h2>
        <p className="text-sm text-gray-500">📍 {shop?.address}</p>
        <div className="border-t border-border pt-4 space-y-2">
          {[
            { label: 'Date', value: formatDate(booking.date) },
            { label: 'Time', value: `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}` },
            { label: 'Barber', value: barber?.name ?? 'Any' },
          ].map(row => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="text-gray-500">{row.label}</span>
              <span className="font-medium text-navy">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Services */}
      <div className="bg-white rounded-card p-6 space-y-3">
        <h3 className="font-syne font-bold text-navy">Services</h3>
        {(booking.services ?? []).filter((s: any) => !s.is_addon).map((svc: any) => (
          <div key={svc.id} className="flex justify-between text-sm">
            <span className="text-gray-600">{svc.name}</span>
            <span className="text-navy">{formatINR(svc.price)}</span>
          </div>
        ))}
        {(booking.services ?? []).filter((s: any) => s.is_addon).map((a: any) => (
          <div key={a.id} className="flex justify-between text-sm">
            <span className="text-gray-400">+ {a.name}</span>
            <span className="text-gray-400">+{formatINR(a.price)}</span>
          </div>
        ))}
        <div className="border-t border-border pt-3 space-y-1">
          <div className="flex justify-between">
            <span className="font-semibold text-navy">Total</span>
            <span className="font-syne font-bold text-navy">{formatINR(booking.total_amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Advance paid</span>
            <span className="text-gold">{formatINR(booking.advance_amount)}</span>
          </div>
        </div>
      </div>

      {booking.instructions && (
        <div className="bg-white rounded-card p-4 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Instructions</p>
          <p className="text-sm text-navy">{booking.instructions}</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {canReview && (
          <Link
            href={`/review/${booking.id}`}
            className="block w-full bg-gold text-navy font-syne font-bold py-4 rounded-2xl text-center hover:bg-gold/90 transition-colors"
          >
            Leave a Review ⭐
          </Link>
        )}
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
            className="w-full bg-error-light text-error font-semibold py-4 rounded-2xl hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
          </button>
        )}
        {canDispute && (
          <Link
            href={`/dispute/${booking.id}`}
            className="block w-full border border-border text-gray-600 font-semibold py-4 rounded-2xl text-center hover:border-gray-300 transition-colors"
          >
            Raise a Dispute
          </Link>
        )}
      </div>
    </div>
  )
}
