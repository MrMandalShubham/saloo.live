'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAvatarById } from '@/lib/avatars'
import Link from 'next/link'

const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32', silver: '#9CA3AF', gold: '#D4AF37', platinum: '#E5E4E2',
}

const MENU_ITEMS = [
  {
    href: '/bookings',
    label: 'My Bookings',
    desc: 'Track upcoming & past visits',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    href: '/loyalty',
    label: 'Loyalty & Rewards',
    desc: 'Points, tiers & exclusive perks',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
  {
    href: '/notifications',
    label: 'Notifications',
    desc: 'Booking alerts & promotions',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  {
    href: '/profile/edit',
    label: 'Edit Profile',
    desc: 'Update name, email & preferences',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
  },
]

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-saloo-teal border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const tierColor = TIER_COLORS[profile?.loyalty_tier] ?? TIER_COLORS.bronze
  const initials = profile?.name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? 'U'

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-6">

      {/* Profile Hero */}
      <div className="bg-royal-gradient rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-royal-lg">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-saloo-teal/10 blur-[40px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 rounded-full bg-blue-500/20 blur-[40px] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-5">
          {(() => {
            const avatarData = getAvatarById(profile?.avatar_url)
            return (
              <div className="w-20 h-20 rounded-2xl border-2 border-saloo-teal/30 flex items-center justify-center shrink-0 overflow-hidden backdrop-blur-sm shadow-glass"
                   style={{ backgroundColor: avatarData?.bg ?? 'rgba(255,255,255,0.05)' }}>
                {avatarData ? (
                  <span className="text-4xl animate-bounce" style={{ animationDuration: '2s' }}>{avatarData.emoji}</span>
                ) : profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-syne font-bold text-saloo-teal text-2xl drop-shadow-[0_0_8px_rgba(201,168,76,0.5)]">{initials}</span>
                )}
              </div>
            )
          })()}
          <div className="flex-1 min-w-0">
            <h2 className="font-syne font-bold text-2xl text-white truncate tracking-tight">{profile?.name ?? 'Your Name'}</h2>
            <p className="text-white/50 text-sm mt-1">{user?.phone ?? profile?.email ?? ''}</p>
            {profile?.loyalty_tier && (
              <span
                className="text-[11px] font-bold capitalize mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{ backgroundColor: tierColor + '25', color: tierColor, borderWidth: 1, borderColor: tierColor + '40' }}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                {profile.loyalty_tier} Member
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {profile?.loyalty_points != null && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-border rounded-2xl p-5 text-center hover:shadow-royal hover:-translate-y-0.5 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-saloo-teal/10 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-saloo-teal" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
            </div>
            <p className="font-syne font-bold text-2xl text-saloo-teal">{profile.loyalty_points.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted mt-1 font-medium">Loyalty Points</p>
          </div>
          <Link href="/loyalty" className="bg-white border border-border rounded-2xl p-5 text-center hover:border-saloo-teal/40 hover:shadow-royal hover:-translate-y-0.5 transition-all duration-300 block">
            <div className="w-10 h-10 rounded-xl bg-navy/5 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-navy" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.896c-.97.073-1.97.073-2.94 0a6.022 6.022 0 01-2.77-.896" /></svg>
            </div>
            <p className="font-syne font-bold text-2xl text-navy capitalize">{profile.loyalty_tier}</p>
            <p className="text-xs text-saloo-teal mt-1 font-bold">View Rewards →</p>
          </Link>
        </div>
      )}

      {/* Menu */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
        {MENU_ITEMS.map((item, idx) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-4 px-5 py-4 hover:bg-lavender/40 transition-all group ${idx < MENU_ITEMS.length - 1 ? 'border-b border-border/60' : ''}`}
          >
            <div className="w-10 h-10 rounded-xl bg-lavender flex items-center justify-center shrink-0 text-navy group-hover:bg-saloo-teal/10 group-hover:text-saloo-teal transition-colors">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-navy text-sm">{item.label}</span>
              <p className="text-muted text-xs mt-0.5">{item.desc}</p>
            </div>
            <svg className="w-4 h-4 text-muted group-hover:text-saloo-teal group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        ))}
      </div>

      {/* Sign out */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-border/60">
          <p className="text-[11px] text-muted font-bold uppercase tracking-widest">Version 1.0.0 · Saloo</p>
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-50/50 transition-all text-left disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </div>
          <span className="font-medium text-red-500">
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </span>
          {signingOut && <div className="ml-auto w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />}
        </button>
      </div>
    </div>
  )
}
