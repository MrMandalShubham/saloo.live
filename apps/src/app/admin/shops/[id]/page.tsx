'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL

type ModalAction = 'suspend' | 'reject'

const STATUS_COLORS: Record<string, string> = {
  verified:  'text-green-400 bg-green-400/10',
  pending:   'text-amber-400 bg-amber-400/10',
  suspended: 'text-red-400 bg-red-400/10',
  rejected:  'text-saloo-dark/60 bg-white/60 backdrop-blur-md shadow-sm',
}

export default function AdminShopDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const supabase = createClient()

  const [modal, setModal] = useState<ModalAction | null>(null)
  const [reason, setReason] = useState('')

  const { data: shop, isLoading } = useQuery({
    queryKey: ['admin-shop', id],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BASE}/functions/v1/owner-shop-get`, {
        headers: { Authorization: `Bearer ${session!.access_token}`, 'X-Shop-Id': id },
      })
      const { data } = await res.json()
      return data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BASE}/functions/v1/admin-shops-update`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session!.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: id, status, reason }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-shop', id] })
      qc.invalidateQueries({ queryKey: ['admin-shops'] })
      closeModal()
    },
  })

  function openModal(action: ModalAction) {
    setReason('')
    setModal(action)
  }

  function closeModal() {
    setModal(null)
    setReason('')
  }

  function confirmModal() {
    if (!modal) return
    const newStatus = modal === 'suspend' ? 'suspended' : 'rejected'
    updateMutation.mutate({ status: newStatus, reason: reason.trim() || undefined })
  }

  if (isLoading) {
    return <div className="text-saloo-dark/60 p-8">Loading…</div>
  }

  const s = shop

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-saloo-dark/60 hover:text-saloo-dark transition-colors text-sm">← Back</button>
        <h1 className="text-saloo-dark text-xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>{s?.name ?? 'Shop'}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[s?.status] ?? 'text-saloo-dark/60 bg-white/60 backdrop-blur-md shadow-sm'}`}>
          {s?.status}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {s?.status === 'pending' && (
          <>
            <button
              onClick={() => updateMutation.mutate({ status: 'verified' })}
              disabled={updateMutation.isPending}
              className="px-5 py-2 bg-green-500/20 text-green-400 rounded-xl text-sm font-medium hover:bg-green-500/30 transition-colors disabled:opacity-40"
            >
              ✓ Approve Shop
            </button>
            <button
              onClick={() => openModal('reject')}
              disabled={updateMutation.isPending}
              className="px-5 py-2 bg-white/60 backdrop-blur-md shadow-sm text-saloo-dark/70 rounded-xl text-sm font-medium hover:bg-white/70 backdrop-blur-md shadow-sm hover:text-saloo-dark/70 transition-colors disabled:opacity-40"
            >
              ✕ Reject Application
            </button>
          </>
        )}
        {s?.status === 'verified' && (
          <button
            onClick={() => openModal('suspend')}
            disabled={updateMutation.isPending}
            className="px-5 py-2 bg-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-40"
          >
            Suspend Shop
          </button>
        )}
        {s?.status === 'suspended' && (
          <button
            onClick={() => updateMutation.mutate({ status: 'verified' })}
            disabled={updateMutation.isPending}
            className="px-5 py-2 bg-white/70 backdrop-blur-md shadow-sm text-saloo-dark/70 rounded-xl text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-40"
          >
            Reinstate Shop
          </button>
        )}
        {s?.status === 'rejected' && (
          <button
            onClick={() => updateMutation.mutate({ status: 'pending' })}
            disabled={updateMutation.isPending}
            className="px-5 py-2 bg-white/60 backdrop-blur-md shadow-sm text-saloo-dark/70 rounded-xl text-sm font-medium hover:bg-white/70 backdrop-blur-md shadow-sm hover:text-saloo-dark/70 transition-colors disabled:opacity-40"
          >
            Restore to Pending
          </button>
        )}
      </div>

      {/* Shop details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'City', value: s?.city },
          { label: 'Phone', value: s?.phone },
          { label: 'Address', value: s?.address },
          { label: 'Rating', value: s ? `⭐ ${s.rating?.toFixed(1)} (${s.review_count} reviews)` : '—' },
          { label: 'Services', value: `${s?.services?.length ?? 0} services` },
          { label: 'Team', value: `${s?.barbers?.length ?? 0} barbers` },
        ].map(row => (
          <div key={row.label} className="bg-white/60 backdrop-blur-md shadow-sm rounded-xl p-4 border border-white/80">
            <p className="text-saloo-dark/60 text-xs">{row.label}</p>
            <p className="text-saloo-dark text-sm font-medium mt-1">{row.value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Services */}
      {(s?.services ?? []).length > 0 && (
        <div className="bg-white/60 backdrop-blur-md shadow-sm rounded-2xl p-4 border border-white/80">
          <h2 className="text-saloo-dark/80 text-xs font-medium uppercase tracking-wide mb-3">Services</h2>
          <div className="space-y-2">
            {s.services.map((sv: any) => (
              <div key={sv.id} className="flex justify-between text-sm">
                <span className="text-saloo-dark/90">{sv.name} <span className="text-saloo-dark/50">({sv.duration_min}min)</span></span>
                <span className="text-saloo-dark/80">₹{sv.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reason modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-sm bg-[#111111] border border-white/80 rounded-2xl overflow-hidden shadow-2xl">
            <div className={`h-1 w-full ${modal === 'suspend' ? 'bg-red-500/60' : 'bg-white/20'}`} />
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-syne font-bold text-saloo-dark text-base">
                  {modal === 'suspend' ? 'Suspend Shop' : 'Reject Application'}
                </h3>
                <p className="text-saloo-dark/60 text-xs mt-1">
                  {modal === 'suspend'
                    ? `Suspending "${s?.name}"`
                    : `Rejecting application for "${s?.name}"`}
                </p>
              </div>
              <div>
                <label className="text-saloo-dark/70 text-xs font-medium block mb-1.5 uppercase tracking-wide">
                  Reason <span className="text-saloo-dark/50 normal-case font-normal">(sent to owner as notification)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={modal === 'suspend'
                    ? 'e.g. Violation of platform terms…'
                    : 'e.g. Incomplete shop information, please reapply…'}
                  rows={3}
                  className="w-full bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-xl px-4 py-3 text-saloo-dark text-sm placeholder-saloo-dark/40 focus:outline-none focus:border-saloo-admin/40 resize-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={confirmModal}
                  disabled={updateMutation.isPending}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 ${
                    modal === 'suspend'
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-white/70 backdrop-blur-md shadow-sm text-saloo-dark/70 hover:bg-white/15'
                  }`}
                >
                  {updateMutation.isPending ? 'Processing…' : modal === 'suspend' ? 'Confirm Suspend' : 'Confirm Reject'}
                </button>
                <button
                  onClick={closeModal}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2.5 bg-white/60 backdrop-blur-md shadow-sm text-saloo-dark/50 hover:text-saloo-dark/80 rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
