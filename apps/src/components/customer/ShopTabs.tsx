'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatINR, formatDuration } from '@saloo/lib'

type Tab = 'services' | 'barbers' | 'styles'

export function ShopTabs({
  services,
  addons,
  barbers,
}: {
  services: any[]
  addons: any[]
  barbers: any[]
}) {
  const [tab, setTab] = useState<Tab>('services')

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'services', label: 'Services', icon: '✂' },
    { key: 'barbers', label: 'Barbers', icon: '👤' },
    { key: 'styles', label: 'Styles', icon: '💇' },
  ]

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-1 bg-lavender/50 rounded-xl p-1 mb-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
              tab === t.key
                ? 'bg-white text-navy shadow-sm'
                : 'text-muted hover:text-secondary'
            }`}
          >
            <span className="text-xs">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'services' && (
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
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
                <p className="font-syne font-bold text-saloo-teal text-lg">{formatINR(svc.price)}</p>
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
        </div>
      )}

      {tab === 'barbers' && (
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          {barbers.length === 0 ? (
            <p className="text-muted text-sm text-center py-6">No barbers listed yet</p>
          ) : (
            <div className="space-y-4">
              {barbers.map((b: any) => {
                const bRating = b.rating ?? b.avg_rating ?? 0
                const portfolioImages = (b.portfolio ?? []).slice(0, 4)
                return (
                  <div key={b.id} className="bg-lavender/30 rounded-2xl p-4 hover:bg-lavender/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/20 to-champagne flex items-center justify-center overflow-hidden border border-saloo-teal/20 shadow-sm shrink-0">
                        {(b.avatar_url || b.photo_url) ? (
                          <Image src={b.avatar_url || b.photo_url} alt={b.name} width={64} height={64} className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-7 h-7 text-saloo-teal/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-navy">{b.name}</p>
                          {b.experience_level && b.experience_level !== 'junior' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium capitalize">{b.experience_level}</span>
                          )}
                        </div>
                        {bRating > 0 && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <svg className="w-3 h-3 text-saloo-teal" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
                            </svg>
                            <span className="text-xs text-muted font-medium">{Number(bRating).toFixed(1)}</span>
                            {b.review_count > 0 && <span className="text-xs text-muted/60">({b.review_count})</span>}
                          </div>
                        )}
                        {b.bio && <p className="text-xs text-secondary mt-1 line-clamp-2">{b.bio}</p>}
                        {b.specialties?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {b.specialties.slice(0, 4).map((s: string) => (
                              <span key={s} className="text-[10px] bg-saloo-teal/10 text-saloo-teal px-2 py-0.5 rounded-full font-medium">{s}</span>
                            ))}
                            {b.specialties.length > 4 && <span className="text-[10px] text-muted">+{b.specialties.length - 4}</span>}
                          </div>
                        )}
                        {b.experience_years > 0 && (
                          <p className="text-[11px] text-muted mt-1">{b.experience_years}+ years experience</p>
                        )}
                      </div>
                    </div>
                    {portfolioImages.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-none">
                        {portfolioImages.map((p: any) => (
                          <div key={p.id} className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative">
                            <Image src={p.image_url} alt={p.caption ?? 'Work'} fill className="object-cover" />
                            {p.is_before_after && (
                              <span className="absolute top-1 left-1 bg-amber-500/90 text-white text-[8px] px-1 py-0.5 rounded font-bold">B/A</span>
                            )}
                          </div>
                        ))}
                        {(b.portfolio ?? []).length > 4 && (
                          <div className="w-20 h-20 rounded-xl bg-navy/5 flex items-center justify-center shrink-0">
                            <span className="text-xs text-muted font-semibold">+{(b.portfolio ?? []).length - 4}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'styles' && (
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-lavender flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">💇</span>
            </div>
            <p className="font-syne font-bold text-navy">Coming Soon</p>
            <p className="text-muted text-sm mt-1">Hairstyle gallery & inspiration</p>
          </div>
        </div>
      )}
    </div>
  )
}
