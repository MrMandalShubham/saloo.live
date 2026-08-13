'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const BASE = process.env['NEXT_PUBLIC_SUPABASE_URL']
const ANON = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''

async function fetchTrending(segment: string) {
  const { data: { session } } = await createClient().auth.getSession()
  const p = new URLSearchParams({ limit: '12', gender: segment })
  const res = await fetch(`${BASE}/functions/v1/hairstyles-list?${p}`, {
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, apikey: ANON },
  })
  return (await res.json()).data ?? []
}

export function TrendingHaircuts({ segment, isWomen }: { segment: string; isWomen: boolean }) {
  const { data: styles = [] } = useQuery({ queryKey: ['trending-styles', segment], queryFn: () => fetchTrending(segment), staleTime: 60_000 })
  const ref = useRef<HTMLDivElement>(null)
  const paused = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || styles.length === 0) return
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const step = () => {
      if (!paused.current && el.scrollWidth > el.clientWidth) {
        el.scrollLeft += 0.5
        if (el.scrollLeft >= el.scrollWidth / 2) el.scrollLeft -= el.scrollWidth / 2
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [styles.length])

  if (styles.length === 0) return null
  const loop = [...styles, ...styles] // duplicate → seamless wrap

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 rounded-full bg-[#FF4F00]" />
          <h2 className="font-syne font-bold text-xl text-navy">Trending {isWomen ? 'looks' : 'haircuts'}</h2>
        </div>
        <Link href="/styles" className="text-saloo-teal text-sm font-semibold">See all</Link>
      </div>
      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto scrollbar-none"
        onPointerEnter={() => { paused.current = true }}
        onPointerLeave={() => { paused.current = false }}
        onTouchStart={() => { paused.current = true }}
        onTouchEnd={() => { paused.current = false }}
      >
        {loop.map((s: any, i: number) => (
          <Link key={`${s.id}-${i}`} href={`/styles/${s.id}`} className="shrink-0 w-32 group" aria-hidden={i >= styles.length}>
            <div className="w-32 h-40 rounded-2xl overflow-hidden border border-border bg-lavender">
              <img src={s.image_url} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
            <p className="font-semibold text-navy text-sm truncate mt-1.5">{s.name}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
