'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const BASE = process.env['NEXT_PUBLIC_SUPABASE_URL']
const ANON = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''

export default function StyleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ['hairstyle', id],
    queryFn: async () => {
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch(`${BASE}/functions/v1/hairstyles-get/${id}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, apikey: ANON },
      })
      return (await res.json()).data
    },
    enabled: !!id,
  })

  if (isLoading) {
    return <div className="max-w-2xl mx-auto py-6"><div className="aspect-square bg-lavender rounded-2xl animate-pulse" /></div>
  }
  const style = data?.style
  if (!style) return <div className="text-center py-20 text-muted">Style not found</div>
  const barbers = data?.barbers ?? []
  const refParam = `ref=${encodeURIComponent(style.image_url)}`

  return (
    <div className="max-w-2xl mx-auto space-y-5 py-6 pb-24">
      <button onClick={() => router.back()} className="text-gray-400 text-sm hover:text-navy">‹ Back to styles</button>

      {/* Full photo */}
      <div className="rounded-3xl overflow-hidden border border-border bg-lavender">
        <img src={style.image_url} alt={style.name} className="w-full object-cover" />
      </div>

      {/* Meta */}
      <div className="space-y-3">
        <h1 className="font-syne text-2xl font-bold text-navy">{style.name}</h1>
        {style.description && <p className="text-secondary text-sm leading-relaxed">{style.description}</p>}
        <div className="flex flex-wrap gap-2">
          {(style.tags ?? []).map((t: string) => <span key={t} className="bg-saloo-teal/10 text-saloo-teal text-xs font-semibold px-3 py-1 rounded-full">{t}</span>)}
        </div>
        {(style.face_shapes?.length > 0) && (
          <p className="text-xs text-muted">Best for: <span className="text-navy font-medium">{style.face_shapes.join(', ')}</span> face{style.hair_types?.length ? ` · ${style.hair_types.join(', ')} hair` : ''}</p>
        )}
      </div>

      {/* Barbers who do this */}
      <div>
        <h2 className="font-syne font-bold text-lg text-navy mb-3">Barbers who do this cut</h2>
        {barbers.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-6 text-center">
            <p className="text-muted text-sm">No matching barbers listed yet. You can still book any shop and show them this photo.</p>
            <Link href="/search" className="inline-block mt-3 text-saloo-teal font-semibold text-sm">Find a shop →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {barbers.map((b: any) => (
              <div key={b.id} className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gold/20 to-champagne flex items-center justify-center overflow-hidden border border-saloo-teal/20 shrink-0">
                  {b.avatar_url ? <img src={b.avatar_url} alt={b.name} className="w-full h-full object-cover" /> : <span className="text-lg">✂️</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy text-sm truncate">{b.name}</p>
                  <p className="text-muted text-xs truncate">{b.shop_name}{b.city ? ` · ${b.city}` : ''}{b.rating > 0 ? ` · ★ ${Number(b.rating).toFixed(1)}` : ''}</p>
                </div>
                <Link href={`/book/${b.shop_id}?barber=${b.id}&${refParam}`}
                  className="shrink-0 bg-saloo-teal text-navy text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-saloo-teal/90 transition-colors">
                  Book this look
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
