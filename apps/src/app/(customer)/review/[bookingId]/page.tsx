'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

async function submitReview(bookingId: string, payload: {
  overall_rating: number
  barber_rating?: number
  wait_rating?: number
  cleanliness_rating?: number
  comment: string
}) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(
    `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/reviews-create`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, ...payload }),
    }
  )
  return res.json()
}

function StarPicker({ label, value, onChange, required }: { label: string; value: number; onChange: (v: number) => void; required?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}{required && ' *'}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="text-2xl transition-colors"
            style={{ color: star <= value ? '#C9A84C' : '#D1D5DB' }}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ReviewPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const router = useRouter()

  const [overall, setOverall] = useState(0)
  const [barber, setBarber] = useState(0)
  const [wait, setWait] = useState(0)
  const [cleanliness, setCleanliness] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => submitReview(bookingId!, {
      overall_rating: overall,
      barber_rating: barber || undefined,
      wait_rating: wait || undefined,
      cleanliness_rating: cleanliness || undefined,
      comment,
    }),
    onSuccess: (data) => {
      if (data.error) { setError(data.error.message); return }
      router.replace(`/bookings/${bookingId}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (overall === 0) { setError('Please select an overall rating.'); return }
    setError('')
    mutation.mutate()
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-2xl text-gray-400 hover:text-navy">‹</button>
        <h1 className="font-syne text-xl font-bold text-navy">Leave a Review</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-card p-6 space-y-4">
          <h2 className="font-syne font-bold text-lg text-navy">Rate Your Experience</h2>
          <StarPicker label="Overall" value={overall} onChange={setOverall} required />
          <div className="border-t border-border" />
          <StarPicker label="Barber skill" value={barber} onChange={setBarber} />
          <StarPicker label="Wait time" value={wait} onChange={setWait} />
          <StarPicker label="Cleanliness" value={cleanliness} onChange={setCleanliness} />
        </div>

        <div className="bg-white rounded-card p-6 space-y-3">
          <h2 className="font-syne font-bold text-lg text-navy">Comments</h2>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Tell us about your experience..."
            maxLength={500}
            rows={4}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold resize-none"
          />
          <p className="text-xs text-gray-400 text-right">{comment.length}/500</p>
        </div>

        {error && <p className="text-error text-sm">{error}</p>}

        <button
          type="submit"
          disabled={mutation.isPending || overall === 0}
          className="w-full bg-gold text-navy font-syne font-bold py-4 rounded-2xl hover:bg-gold/90 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Submitting...' : 'Submit Review ⭐'}
        </button>
      </form>
    </div>
  )
}
