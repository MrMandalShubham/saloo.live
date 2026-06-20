'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const BASE = process.env['NEXT_PUBLIC_SUPABASE_URL']

async function token() {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token
}

export default function ReferPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [applyMsg, setApplyMsg] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['referral'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/functions/v1/referral-get`, { headers: { Authorization: `Bearer ${await token()}` } })
      return (await res.json()).data
    },
  })

  const apply = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/functions/v1/referral-apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message ?? json.error)
      return json.data
    },
    onSuccess: () => {
      setApplyMsg(`✓ Applied! You'll earn 100 points after your first booking.`)
      qc.invalidateQueries({ queryKey: ['referral'] })
    },
    onError: (e: Error) => setApplyMsg(e.message),
  })

  const code = data?.code ?? ''
  const shareText = `Join me on Saloo and book your next haircut! Use my code ${code} to get bonus points on your first booking. https://saloo.live`

  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ title: 'Join me on Saloo', text: shareText }) } catch {}
    } else {
      await navigator.clipboard.writeText(shareText)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 py-6 pb-24">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-2xl text-gray-400 hover:text-navy">‹</button>
        <h1 className="font-syne text-xl font-bold text-navy">Refer & Earn</h1>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0A1116] to-[#0E1B24] rounded-3xl p-7 text-center relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-48 h-48 rounded-full bg-saloo-teal/15 blur-3xl" />
        <div className="relative z-10 space-y-3">
          <div className="text-4xl">🤝</div>
          <h2 className="font-syne text-2xl font-bold text-white">Give 100, Get 200</h2>
          <p className="text-white/60 text-sm max-w-xs mx-auto">
            Your friend earns <span className="text-saloo-teal font-bold">100 points</span> on their first booking.
            You earn <span className="text-saloo-teal font-bold">200 points</span> when they do.
          </p>
        </div>
      </div>

      {/* My code */}
      <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <p className="text-xs text-muted uppercase tracking-widest font-bold">Your Referral Code</p>
        {isLoading ? (
          <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <button onClick={copyCode}
            className="w-full bg-lavender/40 border-2 border-dashed border-saloo-teal/40 rounded-xl py-4 flex items-center justify-center gap-3 hover:bg-lavender/60 transition-colors">
            <span className="font-syne text-3xl font-bold text-navy tracking-[0.2em]">{code}</span>
            <span className="text-saloo-teal text-sm font-semibold">{copied ? '✓ Copied' : 'Tap to copy'}</span>
          </button>
        )}
        <button onClick={handleShare}
          className="w-full bg-saloo-teal text-navy font-syne font-bold py-3.5 rounded-xl hover:bg-saloo-teal/90 transition-colors">
          Share with Friends
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-border rounded-2xl p-5 text-center">
          <p className="font-syne text-3xl font-bold text-navy">{data?.referred_count ?? 0}</p>
          <p className="text-muted text-xs mt-1 font-medium">Friends referred</p>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5 text-center">
          <p className="font-syne text-3xl font-bold text-saloo-teal">{data?.points_earned ?? 0}</p>
          <p className="text-muted text-xs mt-1 font-medium">Points earned</p>
        </div>
      </div>

      {/* Apply a code */}
      {data?.can_apply && (
        <div className="bg-white border border-border rounded-2xl p-5 shadow-sm space-y-3">
          <p className="text-xs text-muted uppercase tracking-widest font-bold">Got a code from a friend?</p>
          <div className="flex gap-2">
            <input
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value.toUpperCase()); setApplyMsg('') }}
              placeholder="ENTER CODE"
              maxLength={8}
              className="flex-1 bg-lavender/30 border border-border rounded-xl px-4 py-3 text-navy font-semibold tracking-widest uppercase focus:outline-none focus:border-saloo-teal/50"
            />
            <button onClick={() => apply.mutate()} disabled={!codeInput.trim() || apply.isPending}
              className="px-5 bg-navy text-white rounded-xl text-sm font-bold disabled:opacity-40">
              {apply.isPending ? '…' : 'Apply'}
            </button>
          </div>
          {applyMsg && <p className={`text-sm ${applyMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>{applyMsg}</p>}
        </div>
      )}
      {data?.already_referred && (
        <p className="text-center text-muted text-sm">✓ You joined via a friend's referral.</p>
      )}

      {/* How it works */}
      <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
        <p className="text-xs text-muted uppercase tracking-widest font-bold mb-4">How it works</p>
        <div className="space-y-4">
          {[
            { n: '1', t: 'Share your code', d: 'Send your code to friends via WhatsApp, SMS, anywhere.' },
            { n: '2', t: 'They book', d: 'Your friend applies your code and completes their first booking.' },
            { n: '3', t: 'You both earn', d: 'They get 100 points, you get 200 — automatically.' },
          ].map(s => (
            <div key={s.n} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-saloo-teal/15 text-saloo-teal font-bold text-sm flex items-center justify-center shrink-0">{s.n}</div>
              <div>
                <p className="font-semibold text-navy text-sm">{s.t}</p>
                <p className="text-muted text-xs mt-0.5">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
