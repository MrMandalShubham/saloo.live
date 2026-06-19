'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const BASE = process.env['NEXT_PUBLIC_SUPABASE_URL']

async function token() {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token
}

const CHAIR_LABEL: Record<string, { label: string; color: string }> = {
  available: { label: 'Available', color: 'text-green-600 bg-green-50' },
  cutting:   { label: 'Cutting',   color: 'text-purple-600 bg-purple-50' },
  cleanup:   { label: 'Cleanup',   color: 'text-amber-600 bg-amber-50' },
  break:     { label: 'On Break',  color: 'text-gray-500 bg-gray-100' },
  offline:   { label: 'Off',       color: 'text-gray-400 bg-gray-50' },
}

export default function QueuePage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['queue-status', shopId],
    queryFn: async () => {
      const res = await fetch(`${BASE}/functions/v1/queue-status?shop_id=${shopId}`, {
        headers: { Authorization: `Bearer ${await token()}` },
      })
      const json = await res.json()
      return json.data
    },
    refetchInterval: 8000, // live poll
  })

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/functions/v1/queue-join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shopId }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
      return json.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue-status', shopId] }),
    onError: (e: Error) => alert(e.message),
  })

  const leaveMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await fetch(`${BASE}/functions/v1/queue-leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: entryId }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
      return json.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['queue-status', shopId] }),
    onError: (e: Error) => alert(e.message),
  })

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-4 py-6">
        {[1, 2].map(i => <div key={i} className="h-32 bg-white border border-border rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  const shop = data?.shop
  const entry = data?.entry
  const inQueue = data?.in_queue

  // ── Not in queue → show join screen ──
  if (!entry) {
    return (
      <div className="max-w-lg mx-auto space-y-5 py-6">
        <button onClick={() => router.back()} className="text-gray-400 text-sm hover:text-navy">‹ Back</button>
        <div className="bg-white border border-border rounded-3xl p-8 text-center space-y-4">
          <div className="text-5xl">🚶</div>
          <h1 className="font-syne text-2xl font-bold text-navy">Join the Walk-in Queue</h1>
          <p className="text-secondary text-sm">{shop?.name ?? 'This shop'} will give you a live token. You'll see how many people are ahead and get an alert when it's your turn.</p>
          <button
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
            className="w-full bg-navy text-white font-syne font-bold py-4 rounded-2xl hover:bg-navy/90 transition-colors disabled:opacity-50"
          >
            {joinMutation.isPending ? 'Joining…' : 'Join Queue Now'}
          </button>
        </div>
      </div>
    )
  }

  // ── Completed ──
  if (entry.status === 'completed' || !inQueue) {
    return (
      <div className="max-w-lg mx-auto space-y-5 py-6 text-center">
        <div className="bg-white border border-border rounded-3xl p-8 space-y-4">
          <div className="text-5xl">✅</div>
          <h1 className="font-syne text-2xl font-bold text-navy">Service Complete!</h1>
          <p className="text-secondary text-sm">Thanks for visiting {shop?.name}. Hope you loved your cut!</p>
          <Link href="/bookings" className="block w-full bg-saloo-teal text-navy font-syne font-bold py-4 rounded-2xl hover:bg-saloo-teal/90 transition-colors">Done</Link>
        </div>
      </div>
    )
  }

  const isCalled = entry.status === 'called'
  const isInChair = entry.status === 'in_chair'
  const aheadCount = data?.ahead_count ?? 0
  const wait = data?.estimated_wait_min ?? 0

  return (
    <div className="max-w-lg mx-auto space-y-5 py-6">
      <button onClick={() => router.back()} className="text-gray-400 text-sm hover:text-navy">‹ Back</button>

      {/* Turn alert banner */}
      {isCalled && (
        <div className="bg-green-500 text-white rounded-3xl p-6 text-center space-y-2 animate-pulse">
          <div className="text-4xl">🎉</div>
          <h2 className="font-syne text-2xl font-bold">It's Your Turn!</h2>
          <p className="text-white/90 text-sm">Please head to the chair now.</p>
        </div>
      )}
      {isInChair && (
        <div className="bg-purple-500 text-white rounded-3xl p-6 text-center space-y-2">
          <div className="text-4xl">💈</div>
          <h2 className="font-syne text-2xl font-bold">You're in the Chair</h2>
          <p className="text-white/90 text-sm">Enjoy your service!</p>
        </div>
      )}

      {/* Token card */}
      <div className="bg-gradient-to-br from-navy to-[#1a2942] text-white rounded-3xl p-8 text-center relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-48 h-48 rounded-full bg-saloo-teal/10 blur-3xl" />
        <div className="relative z-10">
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Your Token</p>
          <p className="font-syne text-7xl font-bold mt-1">#{entry.token_number}</p>
          <p className="text-white/60 text-sm mt-2">{shop?.name}</p>
        </div>
      </div>

      {/* Live stats */}
      {!isCalled && !isInChair && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-border rounded-2xl p-5 text-center">
            <p className="font-syne text-4xl font-bold text-navy">{aheadCount}</p>
            <p className="text-secondary text-xs mt-1 font-medium">{aheadCount === 1 ? 'person' : 'people'} ahead of you</p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-5 text-center">
            <p className="font-syne text-4xl font-bold text-saloo-teal">~{wait}</p>
            <p className="text-secondary text-xs mt-1 font-medium">min estimated wait</p>
          </div>
        </div>
      )}

      {/* Chair status */}
      {data?.chairs?.length > 0 && (
        <div className="bg-white border border-border rounded-2xl p-5">
          <p className="text-secondary text-xs uppercase tracking-widest font-bold mb-3">Chairs</p>
          <div className="space-y-2">
            {data.chairs.map((c: any) => {
              const cfg = CHAIR_LABEL[c.chair_status] ?? CHAIR_LABEL.available
              return (
                <div key={c.id} className="flex items-center justify-between">
                  <span className="text-navy text-sm font-medium">{c.name}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Leave */}
      {(entry.status === 'waiting' || entry.status === 'called') && (
        <button
          onClick={() => { if (confirm('Leave the queue? You\'ll lose your token.')) leaveMutation.mutate(entry.id) }}
          disabled={leaveMutation.isPending}
          className="w-full bg-red-50 text-red-500 font-semibold py-4 rounded-2xl hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          {leaveMutation.isPending ? 'Leaving…' : 'Leave Queue'}
        </button>
      )}

      <p className="text-center text-gray-400 text-xs">Updates live every few seconds</p>
    </div>
  )
}
