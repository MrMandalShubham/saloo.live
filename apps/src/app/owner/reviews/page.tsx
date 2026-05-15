'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const FILTERS = [
  { key: 'all',              label: 'All' },
  { key: 'pending_response', label: 'Needs Response' },
  { key: 'with_photos',      label: 'With Photos' },
]

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session!.access_token
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-saloo-pink text-sm tracking-tight">
      {Array.from({ length: 5 }, (_, i) => i < Math.round(rating) ? '★' : '☆').join('')}
    </span>
  )
}

export default function OwnerReviewsPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [respondingTo, setRespondingTo] = useState<any>(null)
  const [responseText, setResponseText] = useState('')

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['owner-reviews', filter],
    queryFn: async () => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-reviews-list?filter=${filter}`, { headers: { Authorization: `Bearer ${token}` } })
      const { data } = await res.json()
      return data ?? []
    },
  })

  const respondMutation = useMutation({
    mutationFn: async ({ review_id, response }: { review_id: string; response: string }) => {
      const token = await getToken()
      const res = await fetch(`${BASE_URL}/functions/v1/owner-reviews-respond`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_id, response }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner-reviews'] }); setRespondingTo(null); setResponseText('') },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-syne text-2xl font-bold text-saloo-dark">Reviews</h1>
        <p className="text-saloo-dark/50 text-sm mt-0.5">Manage customer feedback</p>
      </div>

      {/* Filters */}
      <div className="flex bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl p-1 gap-1">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${filter === f.key ? 'bg-saloo-pink text-saloo-cream' : 'text-saloo-dark/60 hover:text-saloo-dark'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Reviews */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-32 bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl animate-pulse" />)}</div>
      ) : (reviews ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/60 backdrop-blur-md shadow-sm border border-white/80 flex items-center justify-center mb-3">
            <span className="text-saloo-pink/30 text-xl">★</span>
          </div>
          <p className="text-saloo-dark/50 text-sm">No reviews yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(reviews ?? []).map((r: any) => (
            <div key={r.id} className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-navy border border-white/80 flex items-center justify-center shrink-0">
                    <span className="font-syne font-bold text-saloo-pink text-xs">{(r.user?.name ?? 'C')[0]}</span>
                  </div>
                  <div>
                    <p className="text-saloo-dark font-semibold text-sm">{r.user?.name ?? 'Customer'}</p>
                    <Stars rating={r.rating} />
                  </div>
                </div>
                <span className="text-saloo-dark/40 text-xs">{new Date(r.created_at).toLocaleDateString('en-IN')}</span>
              </div>

              {r.text && <p className="text-saloo-dark/70 text-sm leading-relaxed mb-3 italic">"{r.text}"</p>}
              <p className="text-saloo-dark/40 text-xs mb-4">
                {r.booking_ref}{r.barber_name ? ` · ${r.barber_name}` : ''}
                {r.photos?.length > 0 && ` · 📷 ${r.photos.length} photo${r.photos.length > 1 ? 's' : ''}`}
              </p>

              {r.shop_response ? (
                <div className="bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl p-3">
                  <p className="text-saloo-dark/50 text-xs font-semibold uppercase tracking-wider mb-1.5">Your Reply</p>
                  <p className="text-saloo-dark/70 text-sm">{r.shop_response}</p>
                </div>
              ) : respondingTo?.id === r.id ? (
                <div className="space-y-3">
                  <textarea
                    value={responseText} onChange={e => setResponseText(e.target.value)}
                    placeholder="Write your response…" rows={3}
                    className="w-full bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-4 py-3 text-saloo-dark text-sm placeholder-white/20 focus:outline-none focus:border-saloo-pink/40 resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setRespondingTo(null)} className="px-4 py-2 bg-white/60 backdrop-blur-md shadow-sm text-saloo-dark/60 hover:text-saloo-dark rounded-lg text-sm transition-colors">Cancel</button>
                    <button
                      onClick={() => respondMutation.mutate({ review_id: r.id, response: responseText })}
                      disabled={respondMutation.isPending || !responseText.trim()}
                      className="px-4 py-2 bg-saloo-pink text-saloo-cream rounded-lg text-sm font-bold hover:bg-saloo-pink/90 disabled:opacity-40 transition-all"
                    >
                      {respondMutation.isPending ? 'Posting…' : 'Post Reply'}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setRespondingTo(r); setResponseText('') }}
                  className="px-4 py-2 bg-saloo-pink/8 border border-saloo-pink/20 text-saloo-pink/70 hover:text-saloo-pink hover:bg-saloo-pink/12 rounded-xl text-sm font-semibold transition-all">
                  Reply to Review
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
