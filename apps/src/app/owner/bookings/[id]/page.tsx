'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@saloo/lib'

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-400/10',
  confirmed: 'text-blue-400 bg-blue-400/10',
  in_chair: 'text-purple-400 bg-purple-400/10',
  completed: 'text-green-400 bg-green-400/10',
  no_show: 'text-red-400 bg-red-400/10',
  cancelled: 'text-gray-400 bg-gray-400/10',
}

const ACTIONS: Record<string, Array<{ label: string; status: string; color: string }>> = {
  pending: [
    { label: 'Confirm Booking', status: 'confirmed', color: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30' },
    { label: 'Cancel', status: 'cancelled', color: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30' },
  ],
  confirmed: [
    { label: 'Start Service (In Chair)', status: 'in_chair', color: 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30' },
    { label: 'Mark No Show', status: 'no_show', color: 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30' },
    { label: 'Cancel', status: 'cancelled', color: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30' },
  ],
  in_chair: [
    { label: 'Mark Complete', status: 'completed', color: 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30' },
  ],
}

export default function OwnerBookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const supabase = createClient()

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BASE_URL}/functions/v1/bookings-get/${id}`, {
        headers: { Authorization: `Bearer ${session!.access_token}` },
      })
      const { data } = await res.json()
      return data
    },
    enabled: !!id,
  })

  const mutation = useMutation({
    mutationFn: async (status: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-bookings-update/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session!.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking', id] })
      qc.invalidateQueries({ queryKey: ['owner-bookings'] })
      qc.invalidateQueries({ queryKey: ['owner-dashboard'] })
    },
  })

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><p className="text-saloo-dark/60">Loading…</p></div>
  }

  if (!booking) {
    return <div className="flex items-center justify-center py-20"><p className="text-red-400">Booking not found</p></div>
  }

  const actions = ACTIONS[booking.status] ?? []

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-saloo-pink text-xl hover:opacity-70">‹</button>
        <h1 className="text-2xl font-bold text-saloo-dark" style={{ fontFamily: 'Syne, sans-serif' }}>{booking.booking_ref}</h1>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLOR[booking.status] ?? 'text-gray-400 bg-gray-400/10'}`}>
          {booking.status}
        </span>
      </div>

      <div className="space-y-4">
        {/* Appointment */}
        <Section title="Appointment">
          <Row label="Date" value={booking.date} />
          <Row label="Time" value={`${booking.start_time} – ${booking.end_time}`} />
          <Row label="Barber" value={booking.barber?.name ?? 'Any'} />
          {booking.services?.map((s: any) => (
            <Row key={s.id} label="Service" value={`${s.name} · ${s.duration_min}min`} />
          ))}
          {booking.instructions && <Row label="Instructions" value={booking.instructions} />}
        </Section>

        {/* Payment */}
        <Section title="Payment">
          <Row label="Total" value={formatINR(booking.total_amount)} />
          <Row label="Advance Paid" value={formatINR(booking.advance_amount)} />
          <Row label="Due at Shop" value={formatINR(booking.total_amount - booking.advance_amount)} />
        </Section>

        {/* Actions */}
        {actions.length > 0 && (
          <div>
            <h2 className="text-saloo-dark font-semibold text-lg mb-3">Actions</h2>
            <div className="flex flex-wrap gap-3">
              {actions.map(a => (
                <button
                  key={a.status}
                  onClick={() => {
                    if (window.confirm(`Mark as "${a.label}"?`)) mutation.mutate(a.status)
                  }}
                  disabled={mutation.isPending}
                  className={`px-6 py-3 rounded-xl font-semibold text-sm transition-colors ${a.color}`}
                >
                  {mutation.isPending ? 'Updating…' : a.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 rounded-2xl p-5">
      <h2 className="text-saloo-dark font-semibold text-base mb-4">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-saloo-dark/60 text-sm">{label}</span>
      <span className="text-saloo-dark text-sm font-medium text-right max-w-[60%]">{value}</span>
    </div>
  )
}
