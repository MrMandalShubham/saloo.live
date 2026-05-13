'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const REASONS = [
  { value: 'service_not_delivered', label: 'Service not delivered' },
  { value: 'quality_poor', label: 'Quality was poor' },
  { value: 'wrong_charge', label: 'Wrong amount charged' },
  { value: 'barber_no_show', label: 'Barber did not show up' },
  { value: 'other', label: 'Other' },
] as const

type DisputeReason = typeof REASONS[number]['value']

async function submitDispute(bookingId: string, reason: DisputeReason, description: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(
    `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/disputes-create`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, reason, description }),
    }
  )
  return res.json()
}

export default function DisputePage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const router = useRouter()

  const [reason, setReason] = useState<DisputeReason | null>(null)
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => submitDispute(bookingId!, reason!, description),
    onSuccess: (data) => {
      if (data.error) { setError(data.error.message); return }
      router.replace(`/bookings/${bookingId}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) { setError('Please select a reason.'); return }
    if (description.trim().length < 30) { setError('Please provide at least 30 characters.'); return }
    setError('')
    mutation.mutate()
  }

  const canSubmit = reason !== null && description.trim().length >= 30

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-2xl text-gray-400 hover:text-navy">‹</button>
        <h1 className="font-syne text-xl font-bold text-navy">Raise a Dispute</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-card p-4">
        <p className="font-semibold text-amber-800 text-sm">🛡️ Dispute Protection</p>
        <p className="text-amber-700 text-sm mt-1">
          If raised within 24 hours of your appointment, the payment will be held in escrow until resolved.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-card p-6 space-y-3">
          <h2 className="font-syne font-bold text-lg text-navy">What went wrong?</h2>
          {REASONS.map(r => (
            <label key={r.value} className="flex items-center gap-3 cursor-pointer py-1">
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                style={{
                  borderColor: reason === r.value ? '#C9A84C' : '#D1D5DB',
                  backgroundColor: reason === r.value ? '#C9A84C' : 'transparent',
                }}
              >
                {reason === r.value && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="sr-only"
              />
              <span className="text-sm text-navy">{r.label}</span>
            </label>
          ))}
        </div>

        <div className="bg-white rounded-card p-6 space-y-3">
          <div className="flex justify-between items-baseline">
            <h2 className="font-syne font-bold text-lg text-navy">Describe the issue</h2>
            <span className="text-xs text-gray-400">Min 30 chars</span>
          </div>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Please provide details about what happened..."
            maxLength={1000}
            rows={5}
            className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 resize-none transition-colors ${
              description.length > 0 && description.length < 30 ? 'border-error' : 'border-border focus:border-gold'
            }`}
          />
          <div className="flex justify-between text-xs">
            {description.length > 0 && description.length < 30 ? (
              <span className="text-error">{30 - description.length} more characters needed</span>
            ) : <span />}
            <span className="text-gray-400">{description.length}/1000</span>
          </div>
        </div>

        {error && <p className="text-error text-sm">{error}</p>}

        <button
          type="submit"
          disabled={mutation.isPending || !canSubmit}
          className="w-full bg-navy text-gold font-syne font-bold py-4 rounded-2xl hover:bg-navy/90 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Submitting...' : 'Submit Dispute'}
        </button>
      </form>
    </div>
  )
}
