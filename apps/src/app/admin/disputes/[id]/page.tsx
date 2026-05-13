'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL

const RESOLUTIONS = [
  { key: 'refund_customer', label: 'Full Refund to Customer', desc: 'Return payment to customer' },
  { key: 'pay_shop', label: 'Pay Shop', desc: 'Release funds to shop' },
  { key: 'split', label: 'Split (Specify Amount)', desc: 'Partial refund to customer' },
  { key: 'dismissed', label: 'Dismiss', desc: 'No action taken' },
]

export default function AdminDisputeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const supabase = createClient()

  const [resolution, setResolution] = useState('')
  const [note, setNote] = useState('')
  const [refundAmount, setRefundAmount] = useState('')

  const { data: dispute, isLoading } = useQuery({
    queryKey: ['admin-dispute', id],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BASE}/functions/v1/admin-disputes-list?status=all&limit=200`, {
        headers: { Authorization: `Bearer ${session!.access_token}` },
      })
      const { data } = await res.json()
      return (data ?? []).find((d: any) => d.id === id) ?? null
    },
  })

  const resolveMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BASE}/functions/v1/admin-disputes-resolve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session!.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispute_id: id,
          resolution,
          resolution_note: note,
          refund_amount: refundAmount ? parseFloat(refundAmount) : undefined,
        }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-disputes'] })
      router.push('/admin/disputes')
    },
  })

  if (isLoading) return <div className="text-white/40 p-8">Loading…</div>
  if (!dispute) return <div className="text-white/40 p-8">Dispute not found</div>

  const d = dispute

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-white/40 hover:text-white transition-colors text-sm">← Back</button>
        <h1 className="text-white text-xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Dispute — {d.booking_ref}</h1>
      </div>

      {/* Dispute info */}
      <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Customer', value: d.customer_name },
            { label: 'Shop', value: d.shop_name },
            { label: 'Reason', value: d.reason?.replace(/_/g, ' ') },
            { label: 'Status', value: d.status },
            { label: 'Amount at Stake', value: `₹${d.amount_at_stake?.toLocaleString('en-IN')}` },
            { label: 'In Escrow', value: d.in_escrow ? 'Yes' : 'No' },
            { label: 'Filed', value: new Date(d.created_at).toLocaleDateString('en-IN') },
            { label: 'SLA Deadline', value: d.sla_deadline ? new Date(d.sla_deadline).toLocaleDateString('en-IN') : '—' },
          ].map(row => (
            <div key={row.label}>
              <p className="text-white/30 text-xs">{row.label}</p>
              <p className="text-white/80 text-sm font-medium capitalize mt-0.5">{row.value}</p>
            </div>
          ))}
        </div>
        {d.resolution_note && (
          <div className="pt-3 border-t border-white/10">
            <p className="text-white/30 text-xs">Resolution Note</p>
            <p className="text-white/80 text-sm mt-1">{d.resolution_note}</p>
          </div>
        )}
      </div>

      {/* Resolution form */}
      {d.status !== 'resolved' && (
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-4">
          <h2 className="text-white font-semibold">Resolve Dispute</h2>

          <div className="space-y-2">
            {RESOLUTIONS.map(r => (
              <button
                key={r.key}
                onClick={() => setResolution(r.key)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  resolution === r.key
                    ? 'border-white/40 bg-white/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-white/40 mt-0.5">{r.desc}</p>
              </button>
            ))}
          </div>

          {resolution === 'split' && (
            <div>
              <label className="text-white/40 text-xs block mb-1">Refund Amount (₹)</label>
              <input
                type="number"
                value={refundAmount}
                onChange={e => setRefundAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-white/30"
                placeholder="Enter amount…"
              />
            </div>
          )}

          <div>
            <label className="text-white/40 text-xs block mb-1">Resolution Note *</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-white/30 resize-none"
              placeholder="Explain the decision…"
            />
          </div>

          <button
            onClick={() => resolveMutation.mutate()}
            disabled={!resolution || !note || resolveMutation.isPending}
            className="w-full bg-white/90 text-[#0D0D1A] font-bold py-3 rounded-xl text-sm hover:bg-white transition-colors disabled:opacity-40"
          >
            {resolveMutation.isPending ? 'Resolving…' : 'Confirm Resolution'}
          </button>
        </div>
      )}
    </div>
  )
}
