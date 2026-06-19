export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ShopPhotoCarousel } from '@/components/customer/ShopPhotoCarousel'
import { ShopTabs } from '@/components/customer/ShopTabs'
import type { Metadata } from 'next'

async function fetchShop(id: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch(
    `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/shops-get/${id}`,
    { headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, apikey: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '' }, next: { revalidate: 60 } }
  )
  const json = await res.json()
  return json.data ?? null
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const shop = await fetchShop(params.id)
  if (!shop) return {}
  const rating = shop.rating ?? shop.avg_rating ?? 0
  return {
    title: `${shop.name} — Saloo`,
    description: `Book a haircut at ${shop.name} on Saloo. ${rating > 0 ? `Rated ${Number(rating).toFixed(1)}★.` : ''} ${shop.address}`,
  }
}

const FEATURE_ICONS: Record<string, string> = {
  AC: '❄️', Parking: '🅿️', WiFi: '📶', 'Card Payment': '💳', 'Kids Friendly': '👶',
}

export default async function ShopPage({ params }: { params: { id: string } }) {
  const shop = await fetchShop(params.id)
  if (!shop) notFound()

  const services = (shop.services ?? []).filter((s: any) => !s.is_addon)
  const addons = (shop.services ?? []).filter((s: any) => s.is_addon)
  const reviews = (shop.latest_reviews ?? shop.reviews ?? []).slice(0, 5)
  const shopRating = shop.rating ?? shop.avg_rating ?? 0
  const shopReviewCount = shop.review_count ?? shop.total_reviews ?? 0

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-24 md:pb-6">

      {/* Hero photos */}
      <div className="relative h-72 sm:h-80 rounded-3xl overflow-hidden bg-lavender shadow-royal-lg">
        {shop.photos?.length > 0 ? (
          <ShopPhotoCarousel photos={shop.photos} />
        ) : (
          <div className="h-full flex items-center justify-center bg-gradient-to-br from-lavender to-champagne">
            <div className="w-20 h-20 rounded-2xl bg-white/60 backdrop-blur-sm flex items-center justify-center border border-navy/10 shadow-sm">
              <svg className="w-10 h-10 text-navy/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 11-5.196 3 3 3 0 015.196-3zm1.536-.887a2.165 2.165 0 001.083-1.838c.005-.352.054-.696.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.323 4.323 0 012.068-1.379l5.325-1.628a4.5 4.5 0 012.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.331 4.331 0 0010.607 12m3.736 0l7.794 4.5-.802.215a4.5 4.5 0 01-2.48-.043l-5.326-1.629a4.324 4.324 0 01-2.068-1.379M14.343 12l-2.882 1.664" />
              </svg>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-navy/20 to-transparent" />
        <div className="absolute bottom-5 left-5 right-5">
          <h1 className="font-syne text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-lg">{shop.name}</h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <svg className="w-3.5 h-3.5 text-white/70" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <p className="text-white/70 text-sm">{shop.address}</p>
          </div>
        </div>
        <div className="absolute top-4 right-4 flex gap-2">
          {shopRating > 0 && (
            <span className="bg-black/40 backdrop-blur-md text-white text-sm px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 shadow-sm">
              <svg className="w-3.5 h-3.5 text-saloo-teal" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
              </svg>
              {Number(shopRating).toFixed(1)}
              <span className="text-white/60 font-normal">({shopReviewCount})</span>
            </span>
          )}
          <span className={`text-sm px-3 py-1.5 rounded-xl font-bold backdrop-blur-md shadow-sm ${
            shop.is_open || shop.is_open_now ? 'bg-emerald-500/90 text-white' : 'bg-black/40 text-white/70'
          }`}>
            {shop.is_open || shop.is_open_now ? 'Open Now' : 'Closed'}
          </span>
        </div>
      </div>

      {/* Features */}
      {shop.features?.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {shop.features.map((f: string) => (
            <span key={f} className="bg-white border border-border text-secondary text-xs px-3.5 py-2 rounded-xl font-medium flex items-center gap-1.5 shadow-sm">
              <span className="text-sm">{FEATURE_ICONS[f] ?? '✓'}</span>
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Services / Barbers / Styles tabs */}
      <ShopTabs
        services={services}
        addons={addons}
        barbers={shop.barbers ?? []}
      />

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="bg-white rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-navy/5 flex items-center justify-center">
              <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <h2 className="font-syne font-bold text-xl text-navy">Reviews</h2>
          </div>
          <div className="space-y-1">
            {reviews.map((r: any, idx: number) => (
              <div key={r.id} className={`py-3.5 ${idx < reviews.length - 1 ? 'border-b border-border/60' : ''}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm text-navy">{r.user?.full_name ?? 'Customer'}</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} className={`w-3.5 h-3.5 ${i < r.overall_rating ? 'text-saloo-teal' : 'text-border'}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
                      </svg>
                    ))}
                  </div>
                </div>
                {r.comment && <p className="text-sm text-secondary leading-relaxed">{r.comment}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Book / Queue CTA */}
      <div className="fixed bottom-[68px] left-0 right-0 md:static md:bottom-0 md:mt-0 bg-white/80 backdrop-blur-lg border-t md:border md:rounded-2xl border-border/60 p-4 z-40 shadow-royal-lg md:shadow-sm">
        <div className="flex gap-3">
          <Link
            href={`/book/${shop.id}`}
            className="flex-1 bg-saloo-teal text-navy font-syne font-bold text-center py-4 rounded-2xl hover:bg-saloo-teal/90 transition-all hover:shadow-gold text-lg tracking-tight"
          >
            Book Now
          </Link>
          {shop.walk_in_enabled && (shop.is_open || shop.is_open_now) && (
            <Link
              href={`/queue/${shop.id}`}
              className="flex-1 bg-navy text-white font-syne font-bold text-center py-4 rounded-2xl hover:bg-navy/90 transition-all text-lg tracking-tight flex items-center justify-center gap-2"
            >
              <span>🚶</span> Join Queue
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
