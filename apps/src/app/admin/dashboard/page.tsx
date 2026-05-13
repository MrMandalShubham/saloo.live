export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'

async function getDashboard(token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-dashboard-get`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const { data } = await res.json()
  return data
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className={`rounded-2xl p-5 border ${accent ?? 'bg-white/5 border-white/10'}`}>
      <p className="text-white/50 text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="text-white text-2xl font-bold mt-1" style={{ fontFamily: 'Syne, sans-serif' }}>{value}</p>
      {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
    </div>
  )
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const d = session ? await getDashboard(session.access_token) : null

  const fmt = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n}`

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-white text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Platform Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Real-time overview of Saloo marketplace</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Shops" value={d?.total_shops ?? '—'} sub={`${d?.pending_approval ?? 0} pending`} />
        <StatCard label="Total Users" value={d?.total_users ?? '—'} sub={`+${d?.new_users_today ?? 0} today`} />
        <StatCard label="Bookings Today" value={d?.bookings_today ?? '—'} />
        <StatCard label="Revenue Today" value={d ? fmt(d.revenue_today) : '—'} sub={`MTD: ${d ? fmt(d.revenue_mtd) : '—'}`} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Approvals"
          value={d?.pending_approval ?? '—'}
          accent={d?.pending_approval > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'}
        />
        <StatCard
          label="Open Disputes"
          value={d?.open_disputes ?? '—'}
          sub={`${d?.escalated_disputes ?? 0} escalated`}
          accent={d?.open_disputes > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}
        />
        <StatCard label="Completion Rate" value={`${d?.platform_completion_rate ?? 0}%`} />
        <StatCard label="Avg Rating" value={`⭐ ${d?.platform_avg_rating ?? '—'}`} />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-white/60 text-xs font-medium uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Review Pending Shops', href: '/admin/shops?status=pending', emoji: '🏪', urgent: (d?.pending_approval ?? 0) > 0 },
            { label: 'Resolve Disputes', href: '/admin/disputes?status=open', emoji: '⚖️', urgent: (d?.open_disputes ?? 0) > 0 },
            { label: 'Manage Users', href: '/admin/users', emoji: '👤', urgent: false },
            { label: 'Send Notification', href: '/admin/notifications', emoji: '📢', urgent: false },
          ].map(a => (
            <a
              key={a.href}
              href={a.href}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-colors hover:bg-white/10 ${
                a.urgent ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/10 bg-white/5'
              }`}
            >
              <span className="text-2xl">{a.emoji}</span>
              <span className="text-white/80 text-sm font-medium">{a.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
