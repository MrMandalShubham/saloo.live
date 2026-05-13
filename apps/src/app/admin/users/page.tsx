'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL

async function fetchUsers(token: string, role: string, search: string, page: number) {
  const params = new URLSearchParams({ role, search, page: String(page), limit: '20' })
  const res = await fetch(`${BASE}/functions/v1/admin-users-list?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

const ROLE_TABS = ['all', 'customer', 'shop_owner', 'admin']

const TIER_COLORS: Record<string, string> = {
  bronze: 'text-orange-400',
  silver: 'text-gray-300',
  gold: 'text-yellow-400',
  platinum: 'text-cyan-300',
}

export default function AdminUsersPage() {
  const [role, setRole] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const qc = useQueryClient()
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', role, search, page],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      return fetchUsers(session!.access_token, role, search, page)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BASE}/functions/v1/admin-users-update`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session!.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      return json.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const users: any[] = data?.data ?? []
  const total: number = data?.total ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>User Management</h1>
        <p className="text-white/40 text-sm mt-1">{total} users total</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/30"
          placeholder="Search by name or phone…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
        <div className="flex gap-2">
          {ROLE_TABS.map(r => (
            <button
              key={r}
              onClick={() => { setRole(r); setPage(1) }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                role === r ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {r === 'shop_owner' ? 'Owner' : r}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {['User', 'Role', 'Tier', 'Points', 'Bookings', 'No-shows', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-white/40 text-xs font-medium uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td colSpan={8} className="px-4 py-4"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-white/30">No users found</td></tr>
            ) : users.map((u: any) => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{u.full_name || '—'}</p>
                  <p className="text-white/30 text-xs">{u.phone}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs capitalize bg-white/10 text-white/60">
                    {u.role === 'shop_owner' ? 'Owner' : u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium capitalize ${TIER_COLORS[u.loyalty_tier] ?? 'text-white/40'}`}>
                    {u.loyalty_tier}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/60">{u.loyalty_points}</td>
                <td className="px-4 py-3 text-white/60">{u.total_bookings}</td>
                <td className="px-4 py-3">
                  <span className={u.no_show_count > 2 ? 'text-red-400' : 'text-white/60'}>{u.no_show_count}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_suspended ? 'text-red-400 bg-red-400/10' : 'text-green-400 bg-green-400/10'}`}>
                    {u.is_suspended ? 'Suspended' : 'Active'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {u.is_suspended ? (
                      <button
                        onClick={() => updateMutation.mutate({ user_id: u.id, is_suspended: false })}
                        disabled={updateMutation.isPending}
                        className="px-2 py-1 bg-white/10 text-white/60 rounded-lg text-xs hover:bg-white/20"
                      >
                        Reinstate
                      </button>
                    ) : (
                      <button
                        onClick={() => updateMutation.mutate({ user_id: u.id, is_suspended: true })}
                        disabled={updateMutation.isPending}
                        className="px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30"
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 bg-white/10 text-white/60 rounded-lg text-sm disabled:opacity-40">Prev</button>
          <span className="px-3 py-1.5 text-white/40 text-sm">Page {page} of {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="px-3 py-1.5 bg-white/10 text-white/60 rounded-lg text-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  )
}
