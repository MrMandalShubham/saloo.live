'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { formatINR, formatDistance } from '@saloo/lib'

const FEATURES = ['AC', 'Parking', 'WiFi', 'Card Payment', 'Kids Friendly']

async function searchShops(q: string, filters: { openNow: boolean; features: string[]; sort: string }) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const apikey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''

  const params = new URLSearchParams({
    lat: '22.7196', lng: '75.8577', radius_km: '50', limit: '20',
    ...(q && { q }),
    ...(filters.openNow && { open_now: 'true' }),
    ...(filters.features.length && { features: filters.features.join(',') }),
    sort_by: filters.sort === 'distance' ? 'nearest' : filters.sort,
  })

  // Use search for text queries (works without PostGIS), nearby for geo queries
  const fn = q ? 'shops-search' : 'shops-nearby'
  const res = await fetch(
    `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/${fn}?${params}`,
    { headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, apikey } }
  )
  const json = await res.json()
  return json.data ?? []
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [openNow, setOpenNow] = useState(false)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [sort, setSort] = useState<'distance' | 'rating' | 'price'>('distance')
  const [showFilters, setShowFilters] = useState(false)

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ['shops-search', query, openNow, selectedFeatures, sort],
    queryFn: () => searchShops(query, { openNow, features: selectedFeatures, sort }),
    staleTime: 30_000,
  })

  const toggleFeature = (f: string) =>
    setSelectedFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])

  const activeFilterCount = (openNow ? 1 : 0) + selectedFeatures.length

  return (
    <div className="space-y-5 pb-4 max-w-4xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="font-syne text-2xl font-bold text-navy">Explore</h1>
        <p className="text-muted text-sm mt-0.5">Find your perfect barbershop</p>
      </div>

      {/* Search input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by shop name or area..."
          className="w-full bg-white border border-border rounded-2xl pl-12 pr-24 py-4 text-sm text-navy placeholder-muted focus:outline-none focus:border-saloo-teal/50 focus:shadow-royal transition-all shadow-sm"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-muted hover:text-navy transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`relative p-2.5 rounded-xl transition-all ${showFilters ? 'bg-navy text-white' : 'bg-lavender text-navy hover:bg-navy/10'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-saloo-teal text-navy text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Filters */}
      {showFilters && (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-4 shadow-sm animate-in slide-in-from-top-2">
          <div>
            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-2.5">Features</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setOpenNow(v => !v)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  openNow
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-white border-border text-secondary hover:border-navy/40 hover:text-navy'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${openNow ? 'bg-white' : 'bg-emerald-500'}`} />
                Open Now
              </button>
              {FEATURES.map(f => (
                <button
                  key={f}
                  onClick={() => toggleFeature(f)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    selectedFeatures.includes(f)
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white border-border text-secondary hover:border-navy/40 hover:text-navy'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-2.5">Sort by</p>
            <div className="flex gap-2">
              {([
                { value: 'distance', label: 'Nearest', icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg> },
                { value: 'rating', label: 'Top Rated', icon: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" /></svg> },
                { value: 'price', label: 'Price', icon: <span className="text-sm font-bold">₹</span> },
              ] as const).map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setSort(value)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    sort === value
                      ? 'bg-saloo-teal text-navy border-saloo-teal shadow-gold'
                      : 'bg-white border-border text-secondary hover:border-saloo-teal/40 hover:text-navy'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Result count */}
      {!isLoading && shops.length > 0 && (
        <p className="text-xs text-muted">
          <span className="font-bold text-navy">{shops.length}</span> shops found
          {query && <span> for &ldquo;<span className="text-secondary font-medium">{query}</span>&rdquo;</span>}
        </p>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-2xl overflow-hidden animate-pulse">
              <div className="h-44 bg-lavender" />
              <div className="p-4 space-y-2.5">
                <div className="h-4 bg-lavender rounded-lg w-3/4" />
                <div className="h-3 bg-lavender rounded-lg w-1/2" />
                <div className="h-3 bg-lavender rounded-lg w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : shops.length === 0 ? (
        <div className="text-center py-16 bg-white border border-border rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-lavender flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-navy" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="font-syne font-bold text-navy text-lg">No shops found</p>
          <p className="text-muted text-sm mt-1">Try different filters or a broader search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map((shop: any) => (
            <Link
              key={shop.id}
              href={`/shop/${shop.id}`}
              className="bg-white border border-border rounded-2xl overflow-hidden hover:border-saloo-teal/40 hover:shadow-royal hover:-translate-y-0.5 transition-all duration-300 group"
            >
              <div className="relative h-44 bg-lavender overflow-hidden">
                {shop.photos?.[0] ? (
                  <Image
                    src={shop.photos[0]}
                    alt={shop.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-gradient-to-br from-lavender to-champagne">
                    <div className="w-14 h-14 rounded-2xl bg-white/60 backdrop-blur-sm border border-navy/10 flex items-center justify-center shadow-sm">
                      <svg className="w-7 h-7 text-navy/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 11-5.196 3 3 3 0 015.196-3zm1.536-.887a2.165 2.165 0 001.083-1.838c.005-.352.054-.696.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.323 4.323 0 012.068-1.379l5.325-1.628a4.5 4.5 0 012.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.331 4.331 0 0010.607 12m3.736 0l7.794 4.5-.802.215a4.5 4.5 0 01-2.48-.043l-5.326-1.629a4.324 4.324 0 01-2.068-1.379M14.343 12l-2.882 1.664" />
                      </svg>
                    </div>
                  </div>
                )}
                <span className={`absolute top-3 right-3 text-[11px] px-2.5 py-1 rounded-xl font-bold backdrop-blur-md ${
                  (shop.open_now || shop.is_open_now)
                    ? 'bg-emerald-500/90 text-white shadow-sm'
                    : 'bg-black/50 text-white/70'
                }`}>
                  {(shop.open_now || shop.is_open_now) ? 'Open' : 'Closed'}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-syne font-bold text-navy truncate">{shop.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <svg className="w-3.5 h-3.5 text-muted shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <p className="text-xs text-muted truncate flex-1">{shop.address}</p>
                  {(shop.distance_m != null || shop.distance_km != null) && (
                    <span className="text-[11px] text-navy font-bold bg-lavender px-2 py-0.5 rounded-lg shrink-0">
                      {shop.distance_km != null ? `${Number(shop.distance_km).toFixed(1)} km` : formatDistance(shop.distance_m)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/60">
                  {(shop.rating ?? shop.avg_rating) > 0 && (
                    <span className="text-xs font-semibold text-navy flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-saloo-teal" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
                      </svg>
                      {Number(shop.rating ?? shop.avg_rating).toFixed(1)}
                      <span className="text-muted font-normal">({shop.review_count ?? shop.total_reviews ?? 0})</span>
                    </span>
                  )}
                  {(shop.min_price ?? 0) > 0 && (
                    <span className="text-xs text-muted ml-auto">from <span className="font-bold text-saloo-teal">{formatINR(shop.min_price)}</span></span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
