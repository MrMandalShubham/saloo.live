'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@saloo/lib'

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const STATUS_COLOR: Record<string, string> = {
  pending_confirmation: 'text-orange-400 bg-orange-400/10',
  pending: 'text-amber-400 bg-amber-400/10',
  confirmed: 'text-blue-400 bg-blue-400/10',
  in_chair: 'text-purple-400 bg-purple-400/10',
  completed: 'text-green-400 bg-green-400/10',
  no_show: 'text-red-400 bg-red-400/10',
  cancelled: 'text-gray-400 bg-gray-400/10',
}

const STATUS_LABEL: Record<string, string> = {
  pending_confirmation: '⏳ Awaiting Confirmation',
  pending: 'Pending', confirmed: 'Confirmed', in_chair: 'In Chair',
  completed: 'Completed', no_show: 'No Show', cancelled: 'Cancelled',
}

const ACTIONS: Record<string, Array<{ label: string; status: string; color: string }>> = {
  pending_confirmation: [
    { label: '✓ Confirm Booking', status: 'confirmed', color: 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30' },
    { label: '✕ Reject Booking', status: 'cancelled', color: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30' },
  ],
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
    { label: '✓ Service Complete', status: 'completed', color: 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30' },
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

  const ownerDone = booking.owner_completed
  const customerDone = booking.customer_completed
  const showDualStatus = booking.status === 'in_chair' && (ownerDone || customerDone)
  const actions = (booking.status === 'in_chair' && ownerDone) ? [] : (ACTIONS[booking.status] ?? [])

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-saloo-pink text-xl hover:opacity-70">‹</button>
        <h1 className="text-2xl font-bold text-saloo-dark" style={{ fontFamily: 'Syne, sans-serif' }}>{booking.booking_ref}</h1>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLOR[booking.status] ?? 'text-gray-400 bg-gray-400/10'}`}>
          {STATUS_LABEL[booking.status] ?? booking.status}
        </span>
      </div>

      {/* Dual confirmation status */}
      {showDualStatus && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <p className="text-amber-800 text-sm font-semibold mb-3">Completion Confirmation</p>
          <div className="flex gap-3">
            <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${ownerDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              <span>{ownerDone ? '✅' : '⏳'}</span> You (Owner)
            </div>
            <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${customerDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              <span>{customerDone ? '✅' : '⏳'}</span> Customer
            </div>
          </div>
          {ownerDone && !customerDone && (
            <p className="text-amber-600/70 text-xs mt-2">Waiting for customer to confirm service completion...</p>
          )}
        </div>
      )}

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

        {/* Customer Preferences (grooming profile) */}
        {(() => {
          const p = booking.customer_profile
          const photos = booking.customer_cut_photos ?? []
          const fields = p ? [
            ['Fade', p.fade_level], ['Sides guard', p.guard_number], ['Top', p.top_length],
            ['Neckline', p.neckline], ['Beard', p.beard_style],
            ['Talk', p.talk_level === 'silent' ? 'Silent cut' : p.talk_level === 'casual' ? 'Casual chat' : p.talk_level === 'consult' ? 'Style consult' : p.talk_level],
          ].filter(([, v]) => v) : []
          if (fields.length === 0 && !p?.style_notes && !p?.allergy_notes && photos.length === 0) return null
          return (
            <div className="bg-saloo-pink/5 border border-saloo-pink/20 rounded-2xl p-5">
              <h2 className="text-saloo-dark font-semibold text-base mb-3 flex items-center gap-2"><span>✂️</span> Customer Preferences</h2>
              {fields.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {fields.map(([k, v]) => (
                    <span key={k} className="text-xs bg-white border border-saloo-dark/10 rounded-lg px-2.5 py-1.5 text-saloo-dark/80">
                      <span className="text-saloo-dark/40">{k}:</span> <span className="font-semibold capitalize">{v}</span>
                    </span>
                  ))}
                </div>
              )}
              {p?.style_notes && <p className="text-sm text-saloo-dark/80 mb-1"><span className="text-saloo-dark/40">Notes:</span> {p.style_notes}</p>}
              {p?.allergy_notes && <p className="text-sm text-red-600 mb-2">⚠ Allergies: {p.allergy_notes}</p>}
              {photos.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-none">
                  {photos.map((ph: any) => (
                    <img key={ph.id} src={ph.image_url} alt="Saved cut" className="w-20 h-20 rounded-xl object-cover shrink-0 border border-saloo-dark/10" />
                  ))}
                </div>
              )}
            </div>
          )
        })()}

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
