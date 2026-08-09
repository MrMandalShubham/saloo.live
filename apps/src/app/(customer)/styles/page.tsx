'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { FACE_SHAPES, HAIR_TYPES } from '@/lib/hairstyles'

const BASE = process.env['NEXT_PUBLIC_SUPABASE_URL']
const ANON = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''

export default function StylesPage() {
  const [face, setFace] = useState<string | null>(null)
  const [hair, setHair] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [favs, setFavs] = useState<Set<string>>(new Set())

  const { data: styles = [], isLoading } = useQuery({
    queryKey: ['hairstyles', face, hair],
    queryFn: async () => {
      const supabase = createClient()
      const p = new URLSearchParams()
      if (face) p.set('face_shape', face)
      if (hair) p.set('hair_type', hair)
      const { data: { session } } = await supabase.auth.getSession()
      // Show the customer's segment's styles (women see women+unisex, etc.)
      if (session) {
        const { data: me } = await (supabase as any).from('users').select('segment').eq('id', session.user.id).single()
        if (me?.segment) p.set('gender', me.segment)
      }
      const res = await fetch(`${BASE}/functions/v1/hairstyles-list?${p}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, apikey: ANON },
      })
      return (await res.json()).data ?? []
    },
  })

  // Load saved styles
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setUserId(session.user.id)
      const { data } = await (supabase as any).from('favourite_hairstyles').select('hairstyle_id').eq('user_id', session.user.id)
      if (data) setFavs(new Set(data.map((r: any) => r.hairstyle_id)))
    })
  }, [])

  async function toggleFav(id: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    if (!userId) { window.location.href = '/login'; return }
    const supabase = createClient()
    const isFav = favs.has(id)
    setFavs(prev => { const n = new Set(prev); isFav ? n.delete(id) : n.add(id); return n })
    if (isFav) await (supabase as any).from('favourite_hairstyles').delete().eq('user_id', userId).eq('hairstyle_id', id)
    else await (supabase as any).from('favourite_hairstyles').insert({ user_id: userId, hairstyle_id: id })
  }

  const Chip = ({ active, onClick, children }: any) => (
    <button onClick={onClick}
      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
        active ? 'bg-navy text-white border-navy' : 'bg-white border-border text-secondary hover:border-navy/40'
      }`}>
      {children}
    </button>
  )

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="font-syne text-2xl font-bold text-navy">Hairstyles</h1>
        <p className="text-muted text-sm mt-0.5">Find a look, then show your barber</p>
      </div>

      {/* Face shape */}
      <div>
        <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-2">Face shape</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          <Chip active={!face} onClick={() => setFace(null)}>All</Chip>
          {FACE_SHAPES.map(f => <Chip key={f} active={face === f} onClick={() => setFace(f)}>{f}</Chip>)}
        </div>
      </div>

      {/* Hair type */}
      <div>
        <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-2">Hair type</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          <Chip active={!hair} onClick={() => setHair(null)}>All</Chip>
          {HAIR_TYPES.map(h => <Chip key={h} active={hair === h} onClick={() => setHair(h)}>{h}</Chip>)}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[3/4] bg-lavender rounded-2xl animate-pulse" />)}
        </div>
      ) : styles.length === 0 ? (
        <div className="text-center py-16 bg-white border border-border rounded-2xl">
          <div className="text-4xl mb-2">💇</div>
          <p className="font-syne font-bold text-navy">No styles match</p>
          <p className="text-muted text-sm mt-1">Try clearing a filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {styles.map((s: any) => (
            <Link key={s.id} href={`/styles/${s.id}`} className="group relative rounded-2xl overflow-hidden border border-border bg-lavender aspect-[3/4] hover:shadow-royal transition-all">
              <img src={s.image_url} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <button onClick={(e) => toggleFav(s.id, e)} aria-label="Save"
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-lg leading-none">
                <span className={favs.has(s.id) ? 'text-red-400' : 'text-white/80'}>{favs.has(s.id) ? '♥' : '♡'}</span>
              </button>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="text-white font-semibold text-sm leading-tight">{s.name}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
