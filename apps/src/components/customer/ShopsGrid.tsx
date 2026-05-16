'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { formatINR, formatDistance } from '@saloo/lib'

async function fetchNearbyShops() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const apikey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''

  // Try nearby first (requires shops to have location set)
  const nearbyRes = await fetch(
    `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/shops-nearby?lat=22.7196&lng=75.8577&radius_km=50&limit=12`,
    { headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, apikey } }
  )
  const nearbyJson = await nearbyRes.json()
  if (nearbyJson.data?.length > 0) return nearbyJson.data

  // Fallback: fetch all verified shops via search (for shops without location)
  const searchRes = await fetch(
    `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/shops-search?q=&city=&limit=12`,
    { headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, apikey } }
  )
  const searchJson = await searchRes.json()
  return searchJson.data ?? []
}

export function ShopsGrid() {
  const { data: shops = [], isLoading } = useQuery({
    queryKey: ['shops-nearby'],
    queryFn: fetchNearbyShops,
  })

  if (isLoading) {
    return (
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
    )
  }

  if (!shops.length) {
    return (
      <div className="text-center py-14 bg-white border border-border rounded-2xl">
        <div className="w-14 h-14 rounded-full bg-lavender flex items-center justify-center mx-auto mb-4">
          <span className="font-syne text-navy text-2xl">✂</span>
        </div>
        <p className="font-syne font-bold text-navy">No shops found nearby</p>
        <p className="text-muted text-sm mt-1">Try expanding the search area</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {shops.map((shop: any) => (
        <Link
          key={shop.id}
          href={`/shop/${shop.id}`}
          className="bg-white border border-border rounded-2xl overflow-hidden hover:border-saloo-teal/40 hover:shadow-royal transition-all group"
        >
          <div className="relative h-44 bg-lavender">
            {shop.photos?.[0] ? (
              <Image
                src={shop.photos[0]}
                alt={shop.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-navy/10 border border-navy/20 flex items-center justify-center">
                  <span className="font-syne text-navy text-2xl">✂</span>
                </div>
              </div>
            )}
            {(shop.open_now !== undefined || shop.is_open_now !== undefined) && (
              <span className={`absolute top-2.5 right-2.5 text-[11px] px-2.5 py-1 rounded-pill font-semibold backdrop-blur-sm ${
                (shop.open_now || shop.is_open_now)
                  ? 'bg-emerald-500/90 text-white'
                  : 'bg-black/50 text-white/70'
              }`}>
                {(shop.open_now || shop.is_open_now) ? 'Open' : 'Closed'}
              </span>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-syne font-bold text-navy truncate">{shop.name}</h3>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-xs text-muted truncate flex-1">{shop.address}</p>
              {(shop.distance_m != null || shop.distance_km != null) && (
                <span className="text-xs text-muted ml-2 shrink-0 font-medium">
                  {shop.distance_km != null ? `${Number(shop.distance_km).toFixed(1)} km` : formatDistance(shop.distance_m)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-border">
              {(shop.rating ?? shop.avg_rating) > 0 && (
                <span className="text-xs font-semibold text-navy flex items-center gap-1">
                  <span className="text-saloo-teal">★</span>
                  {Number(shop.rating ?? shop.avg_rating).toFixed(1)}
                  <span className="text-muted font-normal">({shop.review_count ?? shop.total_reviews ?? 0})</span>
                </span>
              )}
              {(shop.min_price ?? 0) > 0 && (
                <span className="text-xs text-muted ml-auto">from <span className="font-semibold text-secondary">{formatINR(shop.min_price)}</span></span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
