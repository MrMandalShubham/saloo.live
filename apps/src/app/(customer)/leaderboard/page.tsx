'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatINR } from '@saloo/lib'

const BASE = process.env['NEXT_PUBLIC_SUPABASE_URL']
const ANON = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''

const MEDAL = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch(`${BASE}/functions/v1/leaderboard-get`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, apikey: ANON },
      })
      return (await res.json()).data
    },
  })

  const shops = data?.trending_shops ?? []
  const barbers = data?.top_barbers ?? []
  const tags = data?.specialist_tags ?? []

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-6">
      <div>
        <h1 className="font-syne text-2xl font-bold text-navy">Discover</h1>
        <p className="text-muted text-sm mt-0.5">Top-rated shops & barbers near you</p>
      </div>

      {/* Specialist tags */}
      {tags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {tags.map((t: any) => (
            <Link key={t.tag} href={`/search?q=${encodeURIComponent(t.tag)}`}
              className="bg-white border border-border rounded-xl px-3.5 py-2 text-sm font-medium text-secondary hover:border-saloo-teal/40 transition-colors">
              {t.tag} <span className="text-muted/60 text-xs">{t.count}</span>
            </Link>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-white border border-border rounded-2xl animate-pulse" />)}</div>
      ) : (
        <>
          {/* Trending shops */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-6 rounded-full bg-saloo-teal" />
              <h2 className="font-syne font-bold text-xl text-navy">Trending Shops</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
              {shops.map((s: any) => (
                <Link key={s.id} href={`/shop/${s.id}`}
                  className="shrink-0 w-44 bg-white border border-border rounded-2xl overflow-hidden hover:border-saloo-teal/40 hover:shadow-royal transition-all">
                  <div className="h-24 bg-lavender relative">
                    {s.photo ? <img src={s.photo} alt={s.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">✂️</div>}
                    {s.is_featured && <span className="absolute top-2 left-2 bg-gold/90 text-navy text-[9px] font-bold px-2 py-0.5 rounded-full">FEATURED</span>}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-navy text-sm truncate">{s.name}</p>
                    <p className="text-muted text-xs truncate">{s.city}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      {s.rating > 0 && <span className="text-saloo-teal text-xs font-bold">★ {Number(s.rating).toFixed(1)}</span>}
                      {s.starting_price != null && <span className="text-muted text-xs">from {formatINR(s.starting_price)}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Top barbers leaderboard */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-6 rounded-full bg-gold" />
              <h2 className="font-syne font-bold text-xl text-navy">Top Barbers</h2>
            </div>
            <div className="bg-white border border-border rounded-2xl divide-y divide-border/60">
              {barbers.length === 0 ? (
                <p className="text-muted text-sm text-center py-6">No ranked barbers yet</p>
              ) : barbers.map((b: any, i: number) => (
                <Link key={b.id} href={`/book/${b.shop_id}?barber=${b.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-lavender/30 transition-colors">
                  <span className="w-7 text-center font-syne font-bold text-lg shrink-0">{MEDAL[i] ?? <span className="text-muted text-sm">{i + 1}</span>}</span>
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gold/20 to-champagne flex items-center justify-center overflow-hidden border border-saloo-teal/20 shrink-0">
                    {b.avatar_url ? <img src={b.avatar_url} alt={b.name} className="w-full h-full object-cover" /> : <span className="text-lg">✂️</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-navy text-sm truncate">{b.name}</p>
                    <p className="text-muted text-xs truncate">{b.shop_name}{b.specialties?.length ? ` · ${b.specialties.slice(0, 2).join(', ')}` : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {b.rating > 0 && <p className="text-saloo-teal text-sm font-bold">★ {Number(b.rating).toFixed(1)}</p>}
                    {b.review_count > 0 && <p className="text-muted/60 text-[10px]">{b.review_count} reviews</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
