'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL

async function fetchDisputes(token: string, status: string, page: number) {
  const params = new URLSearchParams({ status, page: String(page), limit: '20' })
  const res = await fetch(`${BASE}/functions/v1/admin-disputes-list?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

const STATUS_TABS = ['all', 'open', 'escalated', 'resolved']

const STATUS_COLORS: Record<string, string> = {
  open: 'text-amber-400 bg-amber-400/10',
  escalated: 'text-red-400 bg-red-400/10',
  resolved: 'text-green-400 bg-green-400/10',
}

export default function AdminDisputesPage() {
  const [status, setStatus] = useState('open')
  const [page, setPage] = useState(1)
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-disputes', status, page],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      return fetchDisputes(session!.access_token, status, page)
    },
  })

  const disputes: any[] = data?.data ?? []
  const total: number = data?.total ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-saloo-dark text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Dispute Management</h1>
        <p className="text-saloo-dark/60 text-sm mt-1">{total} disputes</p>
      </div>

      <div className="flex gap-2">
        {STATUS_TABS.map(s => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1) }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              status === s ? 'bg-gold text-white shadow-md' : 'text-saloo-dark/60 hover:text-saloo-dark/70'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white/60 backdrop-blur-md shadow-sm rounded-2xl animate-pulse" />
          ))
        ) : disputes.length === 0 ? (
          <div className="text-center py-16 text-saloo-dark/50">No disputes found</div>
        ) : disputes.map((d: any) => (
          <Link
            key={d.id}
            href={`/admin/disputes/${d.id}`}
            className="block bg-white/60 backdrop-blur-md shadow-sm border border-white/80 rounded-2xl p-4 hover:bg-white/70 backdrop-blur-md shadow-sm transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-saloo-dark font-medium text-sm">{d.booking_ref}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[d.status] ?? 'text-saloo-dark/60 bg-white/70 backdrop-blur-md shadow-sm'}`}>
                    {d.status}
                  </span>
                  {d.in_escrow && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium text-purple-400 bg-purple-400/10">Escrow</span>
                  )}
                </div>
                <p className="text-saloo-dark/80 text-xs mt-1 truncate">{d.customer_name} → {d.shop_name}</p>
                <p className="text-saloo-dark/60 text-xs mt-0.5 capitalize">{d.reason?.replace(/_/g, ' ')}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-saloo-dark/90 text-sm font-medium">₹{d.amount_at_stake?.toLocaleString('en-IN')}</p>
                <p className="text-saloo-dark/50 text-xs mt-0.5">{new Date(d.created_at).toLocaleDateString('en-IN')}</p>
                {d.sla_deadline && (
                  <p className={`text-xs mt-0.5 ${new Date(d.sla_deadline) < new Date() ? 'text-red-400' : 'text-saloo-dark/50'}`}>
                    SLA: {new Date(d.sla_deadline).toLocaleDateString('en-IN')}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 bg-white/70 backdrop-blur-md shadow-sm text-saloo-dark/80 rounded-lg text-sm disabled:opacity-40">Prev</button>
          <span className="px-3 py-1.5 text-saloo-dark/60 text-sm">Page {page} of {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="px-3 py-1.5 bg-white/70 backdrop-blur-md shadow-sm text-saloo-dark/80 rounded-lg text-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  )
}
