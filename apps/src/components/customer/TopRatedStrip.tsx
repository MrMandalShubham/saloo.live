'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { fetchHomeData } from '@/lib/homeData'
import { formatINR } from '@saloo/lib'

export function TopRatedStrip({ segment }: { segment: string }) {
  // Same queryKey as the hero → one shared network request
  const { data } = useQuery({ queryKey: ['home-data', segment], queryFn: () => fetchHomeData(segment), staleTime: 60_000 })
  const shops = (data?.shops ?? []).slice(0, 10)
  if (shops.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 rounded-full bg-saloo-teal" />
          <h2 className="font-syne font-bold text-xl text-navy">Top-rated near you</h2>
        </div>
        <Link href="/leaderboard" className="text-saloo-teal text-sm font-semibold">See all</Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {shops.map(s => (
          <Link key={s.id} href={`/shop/${s.id}`} className="shrink-0 w-44 bg-white border border-border rounded-2xl overflow-hidden hover:border-saloo-teal/40 hover:shadow-royal transition-all">
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
  )
}
