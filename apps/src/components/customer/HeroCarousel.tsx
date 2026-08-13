'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { fetchHomeData, type HomeData } from '@/lib/homeData'
import { formatINR } from '@saloo/lib'

type Slide =
  | { kind: 'offer'; id: string; label: string; title: string; shopId: string; shopName: string; photo: string | null }
  | { kind: 'shop'; id: string; name: string; rating: number; city: string; price: number | null; photo: string | null; featured: boolean }

function buildSlides(data?: HomeData): Slide[] {
  if (!data) return []
  const offers: Slide[] = data.offers.slice(0, 5).map(o => ({
    kind: 'offer', id: o.id, label: o.label, title: o.title, shopId: o.shop_id, shopName: o.shop_name, photo: o.shop_photo,
  }))
  const shops: Slide[] = data.shops.slice(0, 5).map(s => ({
    kind: 'shop', id: s.id, name: s.name, rating: s.rating, city: s.city, price: s.starting_price, photo: s.photo, featured: s.is_featured,
  }))
  return [...offers, ...shops].slice(0, 8)
}

export function HeroCarousel({ segment }: { segment: string }) {
  const { data, isLoading } = useQuery({ queryKey: ['home-data', segment], queryFn: () => fetchHomeData(segment), staleTime: 60_000 })
  const slides = buildSlides(data)
  const [idx, setIdx] = useState(0)
  const paused = useRef(false)

  useEffect(() => { if (idx >= slides.length && slides.length) setIdx(0) }, [slides.length, idx])

  useEffect(() => {
    if (slides.length <= 1) return
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => { if (!paused.current) setIdx(p => (p + 1) % slides.length) }, 4000)
    return () => clearInterval(t)
  }, [slides.length])

  if (isLoading) return <div className="h-40 rounded-3xl bg-lavender animate-pulse" />
  if (!slides.length) return null

  return (
    <div
      className="relative rounded-3xl overflow-hidden"
      onPointerEnter={() => { paused.current = true }}
      onPointerLeave={() => { paused.current = false }}
      onTouchStart={() => { paused.current = true }}
    >
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${idx * 100}%)` }}>
        {slides.map(s => (
          <div key={`${s.kind}-${s.id}`} className="min-w-full">
            {s.kind === 'offer'
              ? <OfferSlide s={s} />
              : <ShopSlide s={s} />}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function OfferSlide({ s }: { s: Extract<Slide, { kind: 'offer' }> }) {
  return (
    <Link href={`/shop/${s.shopId}`} className="block relative h-40 sm:h-44 bg-gradient-to-br from-[#C0561D] to-[#FF4F00] p-5 overflow-hidden">
      {s.photo && <img src={s.photo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />}
      <div className="absolute top-[-20%] right-[-10%] w-40 h-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative z-10 h-full flex flex-col justify-between">
        <span className="self-start text-[10px] font-bold uppercase tracking-widest bg-white/25 text-white px-2.5 py-1 rounded-full">Limited offer</span>
        <div>
          <p className="font-syne font-bold text-white text-2xl leading-tight">{s.label}</p>
          <p className="text-white/85 text-sm mt-0.5">{s.title} · {s.shopName}</p>
          <span className="inline-block mt-2 text-xs font-bold text-[#C0561D] bg-white px-3 py-1.5 rounded-lg">Book now →</span>
        </div>
      </div>
    </Link>
  )
}

function ShopSlide({ s }: { s: Extract<Slide, { kind: 'shop' }> }) {
  return (
    <Link href={`/shop/${s.id}`} className="block relative h-40 sm:h-44 bg-gradient-to-br from-[#0A1116] to-[#0E1B24] p-5 overflow-hidden">
      {s.photo && <img src={s.photo} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
      <div className="absolute top-[-20%] right-[-10%] w-40 h-40 rounded-full bg-saloo-teal/15 blur-2xl" />
      <div className="relative z-10 h-full flex flex-col justify-between">
        <span className="self-start text-[10px] font-bold uppercase tracking-widest bg-gold/90 text-navy px-2.5 py-1 rounded-full">{s.featured ? 'Featured' : 'Top rated'}</span>
        <div>
          <p className="font-syne font-bold text-white text-2xl leading-tight truncate">{s.name}</p>
          <p className="text-white/70 text-sm mt-0.5">
            {s.rating > 0 && <span className="text-saloo-teal font-semibold">★ {Number(s.rating).toFixed(1)}</span>}
            {s.city ? ` · ${s.city}` : ''}{s.price != null ? ` · from ${formatINR(s.price)}` : ''}
          </p>
          <span className="inline-block mt-2 text-xs font-bold text-navy bg-saloo-teal px-3 py-1.5 rounded-lg">View shop →</span>
        </div>
      </div>
    </Link>
  )
}
