export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { relativeTime } from '@saloo/lib'

const TIER_CONFIG = {
  bronze:   { gradient: 'from-amber-700 to-amber-900', text: '#FFF', label: 'Bronze', next: 500 },
  silver:   { gradient: 'from-slate-400 to-slate-600', text: '#FFF', label: 'Silver', next: 2000 },
  gold:     { gradient: 'from-yellow-500 to-amber-600', text: '#1E0E5A', label: 'Gold', next: 5000 },
  platinum: { gradient: 'from-slate-200 to-slate-400', text: '#1E0E5A', label: 'Platinum', next: null },
} as const

async function fetchLoyalty() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(
    `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/loyalty-get`,
    { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, next: { revalidate: 60 } }
  )
  const json = await res.json()
  return json.data
}

export default async function LoyaltyPage() {
  const loyalty = await fetchLoyalty()

  const tier = (loyalty?.tier ?? 'bronze') as keyof typeof TIER_CONFIG
  const cfg = TIER_CONFIG[tier]
  const progressPct = cfg.next ? Math.min(100, (loyalty?.points / cfg.next) * 100) : 100

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-4">

      <div>
        <h1 className="font-syne text-2xl font-bold text-navy">Loyalty & Rewards</h1>
        <p className="text-muted text-sm mt-0.5">Earn points with every visit</p>
      </div>

      {/* Tier Hero Card */}
      <div className={`bg-gradient-to-br ${cfg.gradient} rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-royal-lg`}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 blur-[40px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 rounded-full bg-white/5 blur-[30px] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-70" style={{ color: cfg.text }}>
                {cfg.label} Member
              </p>
              <p className="font-syne text-5xl sm:text-6xl font-bold mt-2 tracking-tight" style={{ color: cfg.text }}>
                {loyalty?.points?.toLocaleString('en-IN') ?? 0}
              </p>
              <p className="text-sm opacity-60 mt-1.5 font-medium" style={{ color: cfg.text }}>
                points · {loyalty?.total_visits ?? 0} visits
              </p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-glass">
              <svg className="w-8 h-8" style={{ color: cfg.text }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
          </div>

          {loyalty?.next_tier && (
            <div className="mt-6 space-y-2">
              <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="text-xs font-medium opacity-70" style={{ color: cfg.text }}>
                {loyalty.points_to_next_tier} pts to {loyalty.next_tier}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Redeem */}
      <div className="bg-white border border-border rounded-2xl p-5 space-y-1 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-saloo-teal/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-saloo-teal" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <h2 className="font-syne font-bold text-lg text-navy">Quick Redeem</h2>
        </div>
        {[
          { label: '₹50 Discount',       pts: 500,  desc: `You have ${loyalty?.points ?? 0} pts` },
          { label: 'Free Basic Haircut',  pts: 1000, desc: 'Up to ₹249 value' },
        ].map((r, idx, arr) => (
          <div key={r.label} className={`flex items-center justify-between py-3.5 ${idx < arr.length - 1 ? 'border-b border-border/60' : ''}`}>
            <div>
              <p className="font-semibold text-navy text-sm">{r.label}</p>
              <p className="text-xs text-muted mt-0.5">{r.pts} pts · {r.desc}</p>
            </div>
            <button
              disabled={(loyalty?.points ?? 0) < r.pts}
              className="bg-navy text-saloo-teal px-5 py-2.5 rounded-xl text-xs font-syne font-bold hover:bg-navy-mid transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-royal"
            >
              Redeem
            </button>
          </div>
        ))}
      </div>

      {/* How to Earn */}
      <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-navy/5 flex items-center justify-center">
            <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="font-syne font-bold text-lg text-navy">How to Earn</h2>
        </div>
        <div className="space-y-0.5">
          {[
            { label: '₹1 spent',               pts: '1 pt',       icon: '💰' },
            { label: 'Weekday booking',         pts: '1.5× points', icon: '📅' },
            { label: 'First visit to new shop', pts: '2× points',   icon: '🏪' },
            { label: 'Photo review',            pts: '+50 pts',     icon: '📸' },
            { label: 'Successful referral',     pts: '+100 pts',    icon: '🤝' },
          ].map((item, idx, arr) => (
            <div key={item.label} className={`flex items-center justify-between py-3 ${idx < arr.length - 1 ? 'border-b border-border/60' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="text-base">{item.icon}</span>
                <span className="text-sm text-secondary">{item.label}</span>
              </div>
              <span className="text-sm font-bold text-saloo-teal bg-saloo-teal/5 px-3 py-1 rounded-lg">{item.pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      {loyalty?.transactions?.length > 0 && (
        <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-navy/5 flex items-center justify-center">
              <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="font-syne font-bold text-lg text-navy">History</h2>
          </div>
          <div>
            {loyalty.transactions.slice(0, 10).map((tx: any, idx: number, arr: any[]) => (
              <div key={tx.id} className={`flex items-center justify-between py-3.5 ${idx < arr.length - 1 ? 'border-b border-border/60' : ''}`}>
                <div>
                  <p className="text-sm text-navy font-medium">{tx.description}</p>
                  <p className="text-xs text-muted mt-0.5">{relativeTime(tx.created_at)}</p>
                </div>
                <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                  tx.points > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'
                }`}>
                  {tx.points > 0 ? '+' : ''}{tx.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
