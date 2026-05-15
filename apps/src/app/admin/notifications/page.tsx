'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL

const TARGETS = [
  { key: 'all', label: 'All Users', desc: 'Send to every active user on the platform' },
  { key: 'customers', label: 'Customers Only', desc: 'Send to users with customer role' },
  { key: 'shop_owners', label: 'Shop Owners Only', desc: 'Send to all shop owners' },
]

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [target, setTarget] = useState('all')
  const [sent, setSent] = useState<number | null>(null)
  const supabase = createClient()

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BASE}/functions/v1/admin-notifications-send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session!.access_token}`, 'Content-Type': 'application/json', apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
        body: JSON.stringify({ title, body, target }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: (data) => {
      setSent(data?.sent_to ?? 0)
      setTitle(''); setBody('')
    },
  })

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-saloo-dark text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Send Notification</h1>
        <p className="text-saloo-dark/60 text-sm mt-1">Broadcast push notifications to platform users</p>
      </div>

      {sent !== null && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-green-400 font-medium text-sm">Notification sent!</p>
            <p className="text-green-400/60 text-xs">Delivered to {sent} users</p>
          </div>
          <button onClick={() => setSent(null)} className="ml-auto text-saloo-dark/50 hover:text-saloo-dark/80 text-lg">×</button>
        </div>
      )}

      <div className="bg-white/60 backdrop-blur-md shadow-sm rounded-2xl p-6 border border-white/80 space-y-5">
        {/* Target audience */}
        <div>
          <label className="text-saloo-dark/60 text-xs font-medium uppercase tracking-wide block mb-3">Target Audience</label>
          <div className="space-y-2">
            {TARGETS.map(t => (
              <button
                key={t.key}
                onClick={() => setTarget(t.key)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  target === t.key
                    ? 'border-white/40 bg-white/70 backdrop-blur-md shadow-sm text-saloo-dark'
                    : 'border-white/80 bg-white/60 backdrop-blur-md shadow-sm text-saloo-dark/80 hover:bg-white/70 backdrop-blur-md shadow-sm'
                }`}
              >
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-saloo-dark/60 mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-saloo-dark/60 text-xs font-medium uppercase tracking-wide block mb-2">Title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={65}
            className="w-full bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-4 py-2.5 text-saloo-dark text-sm placeholder-saloo-dark/40 focus:outline-none focus:border-gold/40"
            placeholder="Notification title…"
          />
          <p className="text-saloo-dark/40 text-xs mt-1 text-right">{title.length}/65</p>
        </div>

        {/* Body */}
        <div>
          <label className="text-saloo-dark/60 text-xs font-medium uppercase tracking-wide block mb-2">Message *</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={4}
            maxLength={250}
            className="w-full bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-4 py-2.5 text-saloo-dark text-sm placeholder-saloo-dark/40 focus:outline-none focus:border-gold/40 resize-none"
            placeholder="Notification body…"
          />
          <p className="text-saloo-dark/40 text-xs mt-1 text-right">{body.length}/250</p>
        </div>

        {/* Preview */}
        {(title || body) && (
          <div className="bg-[#0D0D1A] rounded-xl p-4 border border-white/80">
            <p className="text-saloo-dark/50 text-xs mb-2">Preview</p>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-400/20 flex items-center justify-center text-sm flex-shrink-0">🔔</div>
              <div>
                <p className="text-saloo-dark text-sm font-medium">{title || 'Title'}</p>
                <p className="text-saloo-dark/70 text-xs mt-0.5">{body || 'Message body'}</p>
              </div>
            </div>
          </div>
        )}

        {sendMutation.isError && (
          <p className="text-red-400 text-sm">{(sendMutation.error as Error).message}</p>
        )}

        <button
          onClick={() => sendMutation.mutate()}
          disabled={!title || !body || sendMutation.isPending}
          className="w-full bg-white/90 text-[#0D0D1A] font-bold py-3 rounded-xl text-sm hover:bg-white transition-colors disabled:opacity-40"
        >
          {sendMutation.isPending ? 'Sending…' : `Send to ${TARGETS.find(t => t.key === target)?.label}`}
        </button>
      </div>
    </div>
  )
}
