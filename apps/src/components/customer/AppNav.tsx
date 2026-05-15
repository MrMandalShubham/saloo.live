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
      ? [{ href: '/owner/dashboard', label: 'Owner Dashboard' }]
      : [{ href: '/open-shop', label: 'Open a Shop' }]
    ),
  ]

  const PopoverContent = () => (
    <>
      <div className="px-4 py-3 border-b border-saloo-dark/10">
        <p className="text-saloo-dark/40 text-[10px] uppercase tracking-widest mb-2.5">
          {totalAccounts > 1 ? `${totalAccounts} accounts` : 'Logged in as'}
        </p>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-saloo-teal/15 border border-saloo-teal/25 flex items-center justify-center shrink-0">
            <span className="font-syne font-bold text-saloo-teal text-sm">{initial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-saloo-dark text-sm font-semibold truncate">{profile?.name}</p>
            <p className="text-saloo-dark/60 text-xs truncate">{profile?.email}</p>
          </div>
          <span className="text-saloo-teal text-xs">✓</span>
        </div>
        {/* Role badge */}
        <div className="mt-2.5">
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            isAdmin  ? 'bg-saloo-admin/10 border border-saloo-admin/20 text-saloo-admin' :
            isOwner  ? 'bg-saloo-pink/10 border border-saloo-pink/20 text-saloo-pink' :
                       'bg-saloo-teal/15 border border-saloo-teal/30 text-saloo-teal'
          }`}>
            {isAdmin ? 'Admin' : isOwner ? 'Shop Owner' : 'Customer'}
          </span>
        </div>
      </div>

      {/* Shop owner / open a shop shortcut */}
      <div className="px-3 pt-2 pb-1 border-b border-saloo-dark/10">
        {isOwner ? (
          <Link href="/owner/dashboard" onClick={() => setPopover(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-saloo-pink/10 hover:bg-saloo-pink/15 text-saloo-pink text-sm font-medium transition-all">
            <span className="text-base">🏪</span>
            Owner Dashboard
          </Link>
        ) : (
          <Link href="/open-shop" onClick={() => setPopover(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-saloo-dark/5 hover:bg-saloo-dark/10 text-saloo-dark/70 hover:text-saloo-dark text-sm transition-all">
            <span className="text-base">✂</span>
            Open a Shop
          </Link>
        )}
      </div>

      {others.length > 0 && (
        <div className="border-b border-saloo-dark/10">
          {others.map(acc => (
            <button key={acc.id} onClick={() => switchAccount(acc)} disabled={switching}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-saloo-dark/5 transition-all text-left disabled:opacity-50">
              <div className="w-7 h-7 rounded-lg bg-saloo-dark/5 border border-saloo-dark/10 flex items-center justify-center shrink-0">
                <span className="font-syne font-bold text-saloo-dark/50 text-xs">{acc.name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-saloo-dark/80 text-sm truncate">{acc.name}</p>
                <p className="text-saloo-dark/50 text-xs truncate">{acc.email}</p>
              </div>
              {switching
                ? <span className="text-saloo-dark/30 text-xs animate-spin">◌</span>
                : <span className="text-saloo-dark/30 text-xs">›</span>}
            </button>
          ))}
        </div>
      )}

      <div className="p-2 space-y-0.5">
        <button onClick={addAccount}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-saloo-dark/5 text-saloo-dark/60 hover:text-saloo-dark text-sm transition-all text-left">
          <span className="w-5 text-center">+</span>
          Add another account
        </button>
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-500/80 hover:text-red-500 text-sm transition-all text-left">
          <span className="w-5 text-center">↗</span>
          Log out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ── Top header ── */}
      <header className="bg-white/80 backdrop-blur-2xl sticky top-0 z-50 border-b-2 border-[#008B7D]/30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/home" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-saloo-teal/15 border border-saloo-teal/40 flex items-center justify-center group-hover:border-saloo-teal/70 transition-colors">
              <span className="font-syne font-bold text-saloo-teal text-sm">✂</span>
            </div>
            <span className="font-syne text-xl font-bold text-saloo-dark tracking-wide">Saloo</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {desktopNavLinks.map(link => {
              const active = pathname === link.href || pathname.startsWith(link.href + '/')
              const isOpenShop = link.href === '/open-shop'
              const isDashboard = link.href === '/owner/dashboard' || link.href === '/admin/dashboard'
              return (
                <Link key={link.href} href={link.href}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-saloo-teal/15 text-saloo-teal border border-saloo-teal/30 shadow-sm'
                      : isOpenShop
                        ? 'text-saloo-teal/80 hover:text-saloo-teal hover:bg-saloo-teal/10 border border-saloo-teal/20 hover:border-saloo-teal/40'
                        : isDashboard
                          ? 'text-saloo-dark/70 hover:text-saloo-dark hover:bg-saloo-dark/5'
                          : 'text-saloo-dark/60 hover:text-saloo-dark hover:bg-saloo-dark/5'
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
                  pathname.startsWith('/profile') ? 'bg-saloo-teal text-saloo-dark' : 'bg-saloo-teal/15 text-saloo-teal border border-saloo-teal/30 hover:bg-saloo-teal/25'
                }`}>
                  {initial}
                </div>
                {totalAccounts > 1 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-saloo-teal text-saloo-dark text-[8px] font-bold flex items-center justify-center">
                    {totalAccounts}
                  </span>
                )}
              </div>
            </button>
            {popoverOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 bg-white/95 backdrop-blur-xl border border-saloo-dark/10 rounded-2xl shadow-glass-lg overflow-hidden">
                <PopoverContent />
              </div>
            )}
          </div>

          {/* Mobile avatar (top-right) */}
          <div ref={mobileRef} className="relative md:hidden">
            <button onClick={() => setPopover(v => !v)}>
              <div className="relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-syne font-bold text-sm transition-all ${
                  pathname.startsWith('/profile') ? 'bg-saloo-teal text-saloo-dark' : 'bg-saloo-teal/15 text-saloo-teal border border-saloo-teal/30'
                }`}>
                  {initial}
                </div>
                {totalAccounts > 1 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-saloo-teal text-saloo-dark text-[8px] font-bold flex items-center justify-center">
                    {totalAccounts}
                  </span>
                )}
              </div>
            </button>
            {popoverOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 bg-white/95 backdrop-blur-xl border border-saloo-dark/10 rounded-2xl shadow-glass-lg overflow-hidden">
                <PopoverContent />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile bottom nav ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-2xl border-t-2 border-[#008B7D]/30 shadow-glass-lg">
        <div className="flex">
          {BOTTOM_NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href}
                className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all active:scale-95 ${
                  active ? 'text-saloo-teal' : 'text-saloo-dark/50 hover:text-saloo-dark'
                }`}>
                <span className={`text-[26px] font-syne leading-none transition-all ${active ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                <span className={`text-[10px] font-medium leading-none ${active ? 'text-saloo-teal' : ''}`}>
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
