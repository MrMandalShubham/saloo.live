export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatINR } from '@saloo/lib'
import { redirect } from 'next/navigation'

const STATUS_COLOR: Record<string, string> = {
  pending_confirmation: 'text-orange-600 bg-orange-400/20 border-orange-400/40',
  pending:   'text-amber-600 bg-amber-400/20 border-amber-400/40',
  confirmed: 'text-blue-600 bg-blue-400/20 border-blue-400/40',
  in_chair:  'text-purple-600 bg-purple-400/20 border-purple-400/40',
  completed: 'text-green-600 bg-green-400/20 border-green-400/40',
  no_show:   'text-red-600 bg-red-400/20 border-red-400/40',
  cancelled: 'text-saloo-dark/50 bg-black/5 border-black/10',
}
const STATUS_LABEL: Record<string, string> = {
  pending_confirmation: '⏳ Needs Confirm', pending: 'Pending', confirmed: 'Confirmed', in_chair: 'In Chair',
  completed: 'Done', no_show: 'No Show', cancelled: 'Cancelled',
}

async function getDashboardData(shopId: string, supabase: any) {
  const today = new Date().toISOString().split('T')[0]!
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, booking_ref, start_time, end_time, status, total_amount, service_ids, user:users(name), barber:barbers(name)')
    .eq('shop_id', shopId).eq('date', today)
    .not('status', 'in', '("cancelled","expired")').order('start_time')

  const all = bookings ?? []
  const allServiceIds = [...new Set(all.flatMap((b: any) => b.service_ids ?? []))]
  let serviceMap: Record<string, string> = {}
  if (allServiceIds.length > 0) {
    const { data: svcs } = await supabase.from('services').select('id, name').in('id', allServiceIds)
    serviceMap = Object.fromEntries((svcs ?? []).map((s: any) => [s.id, s.name]))
  }

  const today_revenue = all.filter((b: any) => b.status === 'completed').reduce((s: number, b: any) => s + (b.total_amount ?? 0), 0)
  const pending = all.filter((b: any) => b.status === 'pending' || b.status === 'pending_confirmation').length
  const { data: weekData } = await supabase.from('bookings').select('total_amount').eq('shop_id', shopId).eq('status', 'completed').gte('date', weekAgo)
  const weekly_revenue = (weekData ?? []).reduce((s: number, b: any) => s + (b.total_amount ?? 0), 0)
  const { count: active_disputes } = await supabase.from('disputes').select('id', { count: 'exact', head: true }).eq('shop_id', shopId).in('status', ['open', 'under_review'])
  const { data: shop } = await supabase.from('shops').select('rating, review_count').eq('id', shopId).single()

  return {
    today_bookings: all.length, today_revenue, pending_confirmations: pending,
    weekly_revenue, active_disputes: active_disputes ?? 0,
    avg_rating: shop?.rating ?? 0, total_reviews: shop?.review_count ?? 0,
    upcoming_today: all.map((b: any) => ({
      id: b.id, booking_ref: b.booking_ref, start_time: b.start_time, end_time: b.end_time,
      status: b.status, customer_name: b.user?.name ?? 'Guest',
      service_names: (b.service_ids ?? []).map((id: string) => serviceMap[id] ?? id),
      barber_name: b.barber?.name ?? null,
    })),
  }
}

export default async function OwnerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center animate-float">
        <div className="w-16 h-16 rounded-2xl bg-white/60 backdrop-blur-md border border-white/50 shadow-glass flex items-center justify-center mb-4">
          <span className="text-2xl">🏪</span>
        </div>
        <h2 className="font-syne font-bold text-saloo-dark text-xl">Developer Bypass Active</h2>
        <p className="text-saloo-dark/50 text-sm mt-2">Login to see real shop data or use a test account.</p>
      </div>
    )
  }

  const { data: shop } = await supabase.from('shops').select('id, name, status').eq('owner_id', user.id).single()

  if (!shop) {
    redirect('/open-shop')
  }

  if (shop.status === 'rejected') {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center max-w-sm mx-auto space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <span className="text-2xl">✕</span>
        </div>
        <div>
          <h2 className="font-syne font-bold text-saloo-dark text-xl">Application Rejected</h2>
          <p className="text-saloo-dark/70 text-sm mt-2 leading-relaxed">
            Your shop <span className="text-saloo-dark/80 font-medium">{shop.name}</span> was not approved.<br />
            Check your notifications for the reason, or reach out to support.
          </p>
        </div>
        <a href="mailto:support@ono.in" className="text-saloo-pink text-sm hover:underline transition-colors">Contact Support →</a>
      </div>
    )
  }

  if (shop.status === 'suspended') {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center max-w-sm mx-auto space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <span className="text-2xl">⚠</span>
        </div>
        <div>
          <h2 className="font-syne font-bold text-saloo-dark text-xl">Shop Suspended</h2>
          <p className="text-saloo-dark/70 text-sm mt-2 leading-relaxed">
            Your shop <span className="text-saloo-dark/80 font-medium">{shop.name}</span> has been temporarily suspended.<br />
            Check your notifications for the reason, or contact support.
          </p>
        </div>
        <a href="mailto:support@ono.in" className="text-saloo-pink text-sm hover:underline transition-colors">Contact Support →</a>
      </div>
    )
  }

  let data
  try {
    data = await getDashboardData(shop.id, supabase)
  } catch (err) {
    console.error('getDashboardData error:', err)
    data = {
      today_bookings: 0, today_revenue: 0, pending_confirmations: 0,
      weekly_revenue: 0, active_disputes: 0, avg_rating: 0, total_reviews: 0,
      upcoming_today: [],
    }
  }
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-8 animate-fade-up relative z-10">
      {/* Header */}
      <div>
        <p className="text-saloo-dark/60 text-sm font-medium">{greeting}</p>
        <h1 className="font-syne text-3xl font-bold text-saloo-dark mt-0.5">{shop.name}</h1>
      </div>

      {/* Verification pending banner */}
      {shop.status === 'pending' && (
        <div className="bg-amber-100/60 backdrop-blur-md border border-amber-300 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-float">
          <span className="text-amber-500 text-lg shrink-0 mt-0.5">◷</span>
          <div>
            <p className="text-amber-700 text-sm font-semibold">Verification Pending</p>
            <p className="text-amber-900/60 text-xs mt-0.5 leading-relaxed">
              Your shop is under review. You can set up services and availability now — your shop will go live once approved by our team.
            </p>
          </div>
        </div>
      )}

      {/* Alerts */}
      {(data.pending_confirmations > 0 || data.active_disputes > 0) && (
        <div className="bg-white/60 backdrop-blur-md border border-amber-200 shadow-sm rounded-2xl p-4 space-y-2">
          {data.pending_confirmations > 0 && (
            <Link href="/owner/bookings?status=pending_confirmation" className="flex items-center justify-between group">
              <span className="text-amber-600 text-sm font-medium">
                {data.pending_confirmations} booking{data.pending_confirmations > 1 ? 's' : ''} need confirmation
              </span>
              <span className="text-amber-600/50 group-hover:text-amber-600 transition-colors">→</span>
            </Link>
          )}
          {data.active_disputes > 0 && (
            <span className="text-red-500 text-sm font-medium block">
              {data.active_disputes} active dispute{data.active_disputes > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Today's Bookings" value={String(data.today_bookings)} accent />
        <StatCard label="Today's Revenue"  value={formatINR(data.today_revenue)} accent />
        <StatCard label="Pending"          value={String(data.pending_confirmations)} />
        <StatCard label="Week Revenue"     value={formatINR(data.weekly_revenue)} />
      </div>

      {/* Rating row */}
      <div className="flex gap-3">
        <div className="bg-white/60 backdrop-blur-md border border-white/80 shadow-sm rounded-xl px-5 py-3 flex items-center gap-3 animate-float" style={{ animationDelay: '0.2s' }}>
          <span className="text-saloo-pink text-lg">★</span>
          <div>
            <p className="font-syne font-bold text-saloo-dark text-lg leading-none">{data.avg_rating?.toFixed(1)}</p>
            <p className="text-saloo-dark/70 font-medium text-xs mt-0.5">Avg rating</p>
          </div>
        </div>
        <div className="bg-white/60 backdrop-blur-md border border-white/80 shadow-sm rounded-xl px-5 py-3 flex items-center gap-3 animate-float" style={{ animationDelay: '0.4s' }}>
          <span className="text-saloo-dark/30 text-lg">◎</span>
          <div>
            <p className="font-syne font-bold text-saloo-dark text-lg leading-none">{data.total_reviews}</p>
            <p className="text-saloo-dark/70 font-medium text-xs mt-0.5">Reviews</p>
          </div>
        </div>
      </div>

      {/* Today's schedule */}
      <div>
        <p className="text-saloo-dark/60 font-bold text-xs uppercase tracking-widest mb-4">Today's Schedule</p>
        {data.upcoming_today.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md border border-white/80 shadow-sm rounded-2xl p-10 text-center animate-float">
            <p className="text-saloo-dark/60 font-medium text-sm">No bookings today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.upcoming_today.map((b: any, index: number) => (
              <Link key={b.id} href={`/owner/bookings/${b.id}`}
                className="bg-white/60 backdrop-blur-md border border-white/80 shadow-sm hover:shadow-glass-lg hover:-translate-y-1 hover:bg-white/80 rounded-xl p-4 flex items-center justify-between transition-all duration-300 group animate-float" style={{ animationDelay: `${index * 0.15}s` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-saloo-dark font-bold text-sm">{b.start_time} – {b.end_time}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[b.status] ?? 'text-saloo-dark/50 bg-black/5 border-black/10'}`}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </div>
                  <p className="text-saloo-dark/90 font-medium text-sm truncate">{b.customer_name}</p>
                  <p className="text-saloo-dark/60 text-xs mt-0.5 truncate">{b.service_names.join(', ')}{b.barber_name ? ` · ${b.barber_name}` : ''}</p>
                </div>
                <span className="text-saloo-pink/40 group-hover:text-saloo-pink transition-colors ml-4 text-xl">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-saloo-dark/60 font-bold text-xs uppercase tracking-widest mb-4">Quick Actions</p>
        <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Bookings',     href: '/owner/bookings',     icon: '◈' },
            { label: 'Live Queue',   href: '/owner/queue',        icon: '⧖' },
            { label: 'Wallet',       href: '/owner/wallet',       icon: '◉' },
            { label: 'Earnings',     href: '/owner/earnings',     icon: '₹' },
            { label: 'Services',     href: '/owner/services',     icon: '✂' },
            { label: 'Availability', href: '/owner/availability', icon: '◷' },
            { label: 'Analytics',   href: '/owner/analytics',    icon: '◎' },
            { label: 'Team',         href: '/owner/team',         icon: '◉' },
            { label: 'Attendance',   href: '/owner/attendance',   icon: '◴' },
            { label: 'Promotions',   href: '/owner/promotions',   icon: '✦' },
            { label: 'Reviews',      href: '/owner/reviews',      icon: '★' },
            { label: 'Settings',     href: '/owner/settings',     icon: '◐' },
          ].map((a, i) => (
            <Link key={a.href} href={a.href}
              className="bg-white/60 backdrop-blur-md hover:bg-white border border-white/80 shadow-sm hover:shadow-glow-pink hover:-translate-y-1 rounded-xl p-3 flex flex-col items-center gap-1.5 transition-all duration-300 animate-float" style={{ animationDelay: `${i * 0.1}s` }}>
              <span className="text-saloo-pink text-xl leading-none">{a.icon}</span>
              <span className="text-saloo-dark/80 text-[10px] font-bold text-center leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm hover:-translate-y-1 hover:shadow-glow-pink transition-all duration-300 animate-float">
      <p className="text-saloo-dark/70 font-bold text-xs uppercase tracking-wider mb-3">{label}</p>
      <p className={`font-syne text-2xl font-bold ${accent ? 'text-saloo-pink' : 'text-saloo-dark'}`}>{value}</p>
    </div>
  )
}
