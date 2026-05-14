'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Bottom nav — mobile only. "Open a Shop" lives in the profile popover on mobile.
const BOTTOM_NAV = [
  { href: '/home',          label: 'Home',     icon: '⌂' },
  { href: '/search',        label: 'Explore',  icon: '◎' },
  { href: '/bookings',      label: 'Bookings', icon: '◈' },
  { href: '/notifications', label: 'Alerts',   icon: '◉' },
  { href: '/profile',       label: 'Profile',  icon: '◷' },
]

type SavedAccount = { id: string; name: string; email: string; role: string; refresh_token: string }
const KEY = 'saloo_accounts'

function readAccounts(): SavedAccount[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}
function upsertAccount(acc: SavedAccount) {
  const list = readAccounts().filter(a => a.id !== acc.id)
  localStorage.setItem(KEY, JSON.stringify([acc, ...list]))
}

export function AppNav() {
  const pathname = usePathname()
  const router   = useRouter()

  const [profile, setProfile]     = useState<SavedAccount | null>(null)
  const [dbRole, setDbRole]       = useState<string>('customer')
  const [others, setOthers]       = useState<SavedAccount[]>([])
  const [popoverOpen, setPopover] = useState(false)
  const [switching, setSwitching] = useState(false)

  const desktopRef = useRef<HTMLDivElement>(null)
  const mobileRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    // getUser() validates the session server-side — prevents stale localStorage sessions
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const { data: { session } } = await supabase.auth.getSession()
      const meta = user.user_metadata
      const acc: SavedAccount = {
        id:            user.id,
        name:          meta?.full_name ?? meta?.name ?? user.email ?? 'User',
        email:         user.email ?? '',
        role:          'customer',
        refresh_token: session?.refresh_token ?? '',
      }

      // get_user_role() is SECURITY DEFINER — bypasses RLS, always returns correct role
      const { data: role } = await supabase.rpc('get_user_role' as any) as { data: string | null }
      acc.role = role ?? 'customer'
      setDbRole(role ?? 'customer')
      setProfile(acc)
      upsertAccount(acc)
      setOthers(readAccounts().filter(a => a.id !== acc.id))
    })
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      const t = e.target as Node
      if (!desktopRef.current?.contains(t) && !mobileRef.current?.contains(t)) {
        setPopover(false)
      }
    }
    if (popoverOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [popoverOpen])

  async function switchAccount(target: SavedAccount) {
    if (switching) return
    setSwitching(true)
    setPopover(false)
    const supabase = createClient()
    const { data: { session: cur } } = await supabase.auth.getSession()
    if (cur && profile) upsertAccount({ ...profile, refresh_token: cur.refresh_token })
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: target.refresh_token })
    if (error || !data.session) {
      setSwitching(false)
      router.replace(`/login?email=${encodeURIComponent(target.email)}`)
      return
    }
    upsertAccount({ ...target, refresh_token: data.session.refresh_token })
    const { data: profileRow } = await supabase.from('users').select('role').eq('id', data.user!.id).single()
    const role = profileRow?.role ?? 'customer'
    router.replace(role === 'shop_owner' ? '/owner/dashboard' : role === 'admin' ? '/admin/dashboard' : '/home')
    setSwitching(false)
  }

  async function addAccount() {
    setPopover(false)
    const { data: { session } } = await createClient().auth.getSession()
    if (session && profile) upsertAccount({ ...profile, refresh_token: session.refresh_token })
    router.replace('/login')
  }

  async function logout() {
    setPopover(false)
    localStorage.removeItem(KEY)
    await createClient().auth.signOut()
    router.replace('/login')
  }

  const initial       = profile?.name?.[0]?.toUpperCase() ?? 'U'
  const totalAccounts = 1 + others.length
  const isOwner       = dbRole === 'shop_owner'
  const isAdmin       = dbRole === 'admin'

  // Desktop nav links — show "Open a Shop" for customers, "Dashboard" for owners
  const desktopNavLinks = [
    { href: '/home',          label: 'Home'     },
    { href: '/search',        label: 'Explore'  },
    { href: '/bookings',      label: 'Bookings' },
    { href: '/notifications', label: 'Alerts'   },
    { href: '/loyalty',       label: 'Rewards'  },
    { href: '/profile',       label: 'Profile'  },
    ...(isOwner
      ? [{ href: '/owner/dashboard', label: 'Dashboard' }]
      : isAdmin
        ? [{ href: '/admin/dashboard', label: 'Admin' }]
        : [{ href: '/open-shop', label: 'Open a Shop' }]
    ),
  ]

  const PopoverContent = () => (
    <>
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <p className="text-white/25 text-[10px] uppercase tracking-widest mb-2.5">
          {totalAccounts > 1 ? `${totalAccounts} accounts` : 'Logged in as'}
        </p>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/25 flex items-center justify-center shrink-0">
            <span className="font-syne font-bold text-gold text-sm">{initial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{profile?.name}</p>
            <p className="text-white/30 text-xs truncate">{profile?.email}</p>
          </div>
          <span className="text-gold text-xs">✓</span>
        </div>
        {/* Role badge */}
        <div className="mt-2.5">
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            isAdmin  ? 'bg-amber-500/15 text-amber-400' :
            isOwner  ? 'bg-gold/15 text-gold' :
                       'bg-white/[0.06] text-white/30'
          }`}>
            {isAdmin ? 'Admin' : isOwner ? 'Shop Owner' : 'Customer'}
          </span>
        </div>
      </div>

      {/* Shop owner / open a shop shortcut */}
      {!isAdmin && (
        <div className="px-3 pt-2 pb-1 border-b border-white/[0.06]">
          {isOwner ? (
            <Link href="/owner/dashboard" onClick={() => setPopover(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gold/[0.08] hover:bg-gold/[0.14] text-gold text-sm font-medium transition-all">
              <span className="text-base">🏪</span>
              Owner Dashboard
            </Link>
          ) : (
            <Link href="/open-shop" onClick={() => setPopover(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white text-sm transition-all">
              <span className="text-base">✂</span>
              Open a Shop
            </Link>
          )}
        </div>
      )}

      {others.length > 0 && (
        <div className="border-b border-white/[0.06]">
          {others.map(acc => (
            <button key={acc.id} onClick={() => switchAccount(acc)} disabled={switching}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-all text-left disabled:opacity-50">
              <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
                <span className="font-syne font-bold text-white/40 text-xs">{acc.name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/70 text-sm truncate">{acc.name}</p>
                <p className="text-white/25 text-xs truncate">{acc.email}</p>
              </div>
              {switching
                ? <span className="text-white/20 text-xs animate-spin">◌</span>
                : <span className="text-white/20 text-xs">›</span>}
            </button>
          ))}
        </div>
      )}

      <div className="p-2 space-y-0.5">
        <button onClick={addAccount}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] text-white/50 hover:text-white text-sm transition-all text-left">
          <span className="w-5 text-center">+</span>
          Add another account
        </button>
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/[0.07] text-red-400/60 hover:text-red-400 text-sm transition-all text-left">
          <span className="w-5 text-center">↗</span>
          Log out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ── Top header ── */}
      <header className="bg-navy sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/home" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/40 flex items-center justify-center group-hover:border-gold/70 transition-colors">
              <span className="font-syne font-bold text-gold text-sm">✂</span>
            </div>
            <span className="font-syne text-xl font-bold text-white tracking-wide">Saloo</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {desktopNavLinks.map(link => {
              const active = pathname === link.href || pathname.startsWith(link.href + '/')
              const isOpenShop = link.href === '/open-shop'
              const isDashboard = link.href === '/owner/dashboard' || link.href === '/admin/dashboard'
              return (
                <Link key={link.href} href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-gold/15 text-gold border border-gold/25'
                      : isOpenShop
                        ? 'text-gold/70 hover:text-gold hover:bg-gold/[0.08] border border-gold/15 hover:border-gold/30'
                        : isDashboard
                          ? 'text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/[0.08]'
                          : 'text-white/60 hover:text-white hover:bg-white/[0.08]'
                  }`}>
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Desktop profile avatar */}
          <div ref={desktopRef} className="relative hidden md:block">
            <button onClick={() => setPopover(v => !v)} className="flex items-center gap-2.5 group">
              <div className="relative">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-syne font-bold text-sm transition-all ${
                  pathname.startsWith('/profile') ? 'bg-gold text-navy' : 'bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25'
                }`}>
                  {initial}
                </div>
                {totalAccounts > 1 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gold text-navy text-[8px] font-bold flex items-center justify-center">
                    {totalAccounts}
                  </span>
                )}
              </div>
            </button>
            {popoverOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 bg-[#111111] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
                <PopoverContent />
              </div>
            )}
          </div>

          {/* Mobile avatar (top-right) */}
          <div ref={mobileRef} className="relative md:hidden">
            <button onClick={() => setPopover(v => !v)}>
              <div className="relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-syne font-bold text-sm transition-all ${
                  pathname.startsWith('/profile') ? 'bg-gold text-navy' : 'bg-gold/15 text-gold border border-gold/30'
                }`}>
                  {initial}
                </div>
                {totalAccounts > 1 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gold text-navy text-[8px] font-bold flex items-center justify-center">
                    {totalAccounts}
                  </span>
                )}
              </div>
            </button>
            {popoverOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 bg-[#111111] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
                <PopoverContent />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile bottom nav ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-navy border-t border-white/10">
        <div className="flex">
          {BOTTOM_NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href}
                className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-all active:scale-95 ${
                  active ? 'text-gold' : 'text-white/40 hover:text-white/70'
                }`}>
                <span className={`text-xl font-syne leading-none transition-all ${active ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <span className={`text-[10px] font-medium leading-none ${active ? 'text-gold' : ''}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
