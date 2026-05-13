'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL

async function fetchShops(token: string, status: string, search: string, page: number) {
  const params = new URLSearchParams({ status, search, page: String(page), limit: '20' })
  const res = await fetch(`${BASE}/functions/v1/admin-shops-list?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

async function updateShopStatus(token: string, payload: any) {
  const res = await fetch(`${BASE}/functions/v1/admin-shops-update`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json.data
}

const STATUS_TABS = ['all', 'pending', 'verified', 'suspended', 'rejected']

const STATUS_COLORS: Record<string, string> = {
  verified:  'text-green-400 bg-green-400/10',
  pending:   'text-amber-400 bg-amber-400/10',
  suspended: 'text-red-400 bg-red-400/10',
  rejected:  'text-white/40 bg-white/5',
}

type ModalAction = 'suspend' | 'reject'

interface ActionModal {
  shopId: string
  shopName: string
  action: ModalAction
}

export default function AdminShopsPage() {
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<ActionModal | null>(null)
  const [reason, setReason] = useState('')
  const qc = useQueryClient()

  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-shops', status, search, page],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      return fetchShops(session!.access_token, status, search, page)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data: { session } } = await supabase.auth.getSession()
      return updateShopStatus(session!.access_token, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-shops'] })
      closeModal()
    },
  })

  function openModal(shopId: string, shopName: string, action: ModalAction) {
    setReason('')
    setModal({ shopId, shopName, action })
  }

  function closeModal() {
    setModal(null)
    setReason('')
  }

  function confirmModal() {
    if (!modal) return
    const newStatus = modal.action === 'suspend' ? 'suspended' : 'rejected'
    updateMutation.mutate({ shop_id: modal.shopId, status: newStatus, reason: reason.trim() || undefined })
  }

  const shops: any[] = data?.data ?? []
  const total: number = data?.total ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Shop Management</h1>
        <p className="text-white/40 text-sm mt-1">{total} shops total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/30"
          placeholder="Search by name…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1) }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                status === s ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {['Shop', 'Owner', 'City', 'Rating', 'Bookings', 'Revenue', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td colSpan={8} className="px-4 py-4">
                    <div className="h-4 bg-white/5 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : shops.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-white/30">No shops found</td>
              </tr>
            ) : shops.map((shop: any) => (
              <tr key={shop.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/admin/shops/${shop.id}`} className="text-white font-medium hover:text-gold transition-colors">
                    {shop.name}
                  </Link>
                  <p className="text-white/30 text-xs">{new Date(shop.created_at).toLocaleDateString('en-IN')}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-white/80 text-xs">{shop.owner_name || '—'}</p>
                  <p className="text-white/30 text-xs">{shop.owner_phone}</p>
                </td>
                <td className="px-4 py-3 text-white/60">{shop.city}</td>
                <td className="px-4 py-3 text-white/60">⭐ {shop.rating?.toFixed(1) ?? '—'}</td>
                <td className="px-4 py-3 text-white/60">{shop.total_bookings}</td>
                <td className="px-4 py-3 text-white/60">
                  {shop.total_revenue >= 1000 ? `₹${(shop.total_revenue / 1000).toFixed(1)}K` : `₹${shop.total_revenue}`}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[shop.status] ?? 'text-white/40'}`}>
                    {shop.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {shop.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateMutation.mutate({ shop_id: shop.id, status: 'verified' })}
                          disabled={updateMutation.isPending}
                          className="px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs hover:bg-green-500/30 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openModal(shop.id, shop.name, 'reject')}
                          disabled={updateMutation.isPending}
                          className="px-2 py-1 bg-white/5 text-white/40 rounded-lg text-xs hover:bg-white/10 hover:text-white/60 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {shop.status === 'verified' && (
                      <button
                        onClick={() => openModal(shop.id, shop.name, 'suspend')}
                        disabled={updateMutation.isPending}
                        className="px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30 transition-colors"
                      >
                        Suspend
                      </button>
                    )}
                    {shop.status === 'suspended' && (
                      <button
                        onClick={() => updateMutation.mutate({ shop_id: shop.id, status: 'verified' })}
                        disabled={updateMutation.isPending}
                        className="px-2 py-1 bg-white/10 text-white/60 rounded-lg text-xs hover:bg-white/20 transition-colors"
                      >
                        Reinstate
                      </button>
                    )}
                    {shop.status === 'rejected' && (
                      <button
                        onClick={() => updateMutation.mutate({ shop_id: shop.id, status: 'pending' })}
                        disabled={updateMutation.isPending}
                        className="px-2 py-1 bg-white/5 text-white/40 rounded-lg text-xs hover:bg-white/10 hover:text-white/60 transition-colors"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 bg-white/10 text-white/60 rounded-lg text-sm disabled:opacity-40">Prev</button>
          <span className="px-3 py-1.5 text-white/40 text-sm">Page {page} of {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="px-3 py-1.5 bg-white/10 text-white/60 rounded-lg text-sm disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Reason modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-sm bg-[#111111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className={`h-1 w-full ${modal.action === 'suspend' ? 'bg-red-500/60' : 'bg-white/20'}`} />
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-syne font-bold text-white text-base">
                  {modal.action === 'suspend' ? 'Suspend Shop' : 'Reject Application'}
                </h3>
                <p className="text-white/40 text-xs mt-1">
                  {modal.action === 'suspend'
                    ? `Suspending "${modal.shopName}"`
                    : `Rejecting application for "${modal.shopName}"`}
                </p>
              </div>
              <div>
                <label className="text-white/50 text-xs font-medium block mb-1.5 uppercase tracking-wide">
                  Reason <span className="text-white/30 normal-case font-normal">(sent to owner as notification)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={modal.action === 'suspend'
                    ? 'e.g. Violation of platform terms…'
                    : 'e.g. Incomplete shop information, please reapply…'}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/30 resize-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={confirmModal}
                  disabled={updateMutation.isPending}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 ${
                    modal.action === 'suspend'
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  {updateMutation.isPending ? 'Processing…' : modal.action === 'suspend' ? 'Confirm Suspend' : 'Confirm Reject'}
                </button>
                <button
                  onClick={closeModal}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2.5 bg-white/5 text-white/30 hover:text-white/60 rounded-xl text-sm transition-all"
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
