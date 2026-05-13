import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatINR, formatDuration } from '@saloo/lib'
import type { Metadata } from 'next'

async function fetchShop(id: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch(
    `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/functions/v1/shops-get/${id}`,
    { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, next: { revalidate: 60 } }
  )
  const json = await res.json()
  return json.data ?? null
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const shop = await fetchShop(params.id)
  if (!shop) return {}
  return {
    title: `${shop.name} — Saloo`,
    description: `Book a haircut at ${shop.name} on Saloo. ${shop.avg_rating > 0 ? `Rated ${shop.avg_rating.toFixed(1)}★.` : ''} ${shop.address}`,
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
  const reviews = (shop.reviews ?? []).slice(0, 5)

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-24 md:pb-6">

      {/* Hero photos */}
      <div className="relative h-72 sm:h-80 rounded-3xl overflow-hidden bg-lavender shadow-royal-lg">
        {shop.photos?.[0] ? (
          <Image src={shop.photos[0]} alt={shop.name} fill className="object-cover" priority />
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
          {shop.avg_rating > 0 && (
            <span className="bg-black/40 backdrop-blur-md text-white text-sm px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 shadow-sm">
              <svg className="w-3.5 h-3.5 text-gold" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
              </svg>
              {shop.avg_rating.toFixed(1)}
              <span className="text-white/60 font-normal">({shop.total_reviews})</span>
            </span>
          )}
          <span className={`text-sm px-3 py-1.5 rounded-xl font-bold backdrop-blur-md shadow-sm ${
            shop.is_open ? 'bg-emerald-500/90 text-white' : 'bg-black/40 text-white/70'
          }`}>
            {shop.is_open ? 'Open Now' : 'Closed'}
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

      {/* Services */}
      <section className="bg-white rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gold/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199" />
            </svg>
          </div>
          <h2 className="font-syne font-bold text-xl text-navy">Services</h2>
        </div>
        <div className="space-y-0.5">
          {services.map((svc: any, idx: number) => (
            <div key={svc.id} className={`flex items-center justify-between py-3.5 ${idx < services.length - 1 ? 'border-b border-border/60' : ''}`}>
              <div>
                <p className="font-semibold text-navy">{svc.name}</p>
                <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {formatDuration(svc.duration_min)}
                </p>
              </div>
              <p className="font-syne font-bold text-gold text-lg">{formatINR(svc.price)}</p>
            </div>
          ))}
        </div>
        {addons.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">Add-ons</p>
            <div className="space-y-0.5">
              {addons.map((a: any, idx: number) => (
                <div key={a.id} className={`flex items-center justify-between py-2.5 ${idx < addons.length - 1 ? 'border-b border-border/60' : ''}`}>
                  <p className="text-sm text-secondary">+ {a.name}</p>
                  <p className="text-sm font-semibold text-navy">+{formatINR(a.price)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Barbers */}
      {shop.barbers?.length > 0 && (
        <section className="bg-white rounded-2xl border border-border p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-navy/5 flex items-center justify-center">
              <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <h2 className="font-syne font-bold text-xl text-navy">Our Barbers</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {shop.barbers.map((b: any) => (
              <div key={b.id} className="text-center bg-lavender/30 rounded-2xl p-4 hover:bg-lavender/60 transition-colors">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/20 to-champagne flex items-center justify-center mx-auto mb-3 overflow-hidden border border-gold/20 shadow-sm">
                  {b.photo_url ? (
                    <Image src={b.photo_url} alt={b.name} width={64} height={64} className="rounded-2xl object-cover" />
                  ) : (
                    <svg className="w-7 h-7 text-gold/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  )}
                </div>
                <p className="font-semibold text-navy text-sm">{b.name}</p>
                {b.avg_rating > 0 && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <svg className="w-3 h-3 text-gold" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
                    </svg>
                    <span className="text-xs text-muted font-medium">{b.avg_rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

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
                      <svg key={i} className={`w-3.5 h-3.5 ${i < r.overall_rating ? 'text-gold' : 'text-border'}`} fill="currentColor" viewBox="0 0 24 24">
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

      {/* Book CTA */}
      <div className="fixed bottom-0 left-0 right-0 md:static md:mt-0 bg-white/80 backdrop-blur-lg border-t md:border md:rounded-2xl border-border/60 p-4 z-40 shadow-royal-lg md:shadow-sm">
        <Link
          href={`/book/${shop.id}`}
          className="block w-full bg-gold text-navy font-syne font-bold text-center py-4 rounded-2xl hover:bg-gold/90 transition-all hover:shadow-gold text-lg tracking-tight"
        >
          Book Now
        </Link>
      </div>
    </div>
  )
}
