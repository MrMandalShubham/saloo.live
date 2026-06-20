'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/owner/dashboard',   icon: '▦' },
  { label: 'Queue',        href: '/owner/queue',       icon: '⧖' },
  { label: 'Bookings',     href: '/owner/bookings',    icon: '◈' },
  { label: 'Wallet',       href: '/owner/wallet',      icon: '◉' },
  { label: 'Earnings',     href: '/owner/earnings',    icon: '₹' },
  { label: 'Services',     href: '/owner/services',    icon: '✂' },
  { label: 'Team',         href: '/owner/team',        icon: '◉' },
  { label: 'Attendance',   href: '/owner/attendance',  icon: '◴' },
  { label: 'Analytics',   href: '/owner/analytics',   icon: '◎' },
  { label: 'Availability', href: '/owner/availability',icon: '◷' },
  { label: 'Promotions',   href: '/owner/promotions',  icon: '✦' },
  { label: 'Reviews',      href: '/owner/reviews',     icon: '★' },
  { label: 'Settings',     href: '/owner/settings',    icon: '◐' },
]

// ── Account store (localStorage) ─────────────────────────────────────────────
type SavedAccount = {
  id: string
  name: string
  email: string
  role: string
  refresh_token: string
}

const KEY = 'saloo_accounts'

function readAccounts(): SavedAccount[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

function upsertAccount(acc: SavedAccount) {
  const list = readAccounts().filter(a => a.id !== acc.id)
  localStorage.setItem(KEY, JSON.stringify([acc, ...list]))
}


// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ initial, size = 'md' }: { initial: string; size?: 'sm' | 'md' }) {
  return (
    <div className={`${size === 'sm' ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm'} rounded-lg bg-saloo-pink/15 border border-saloo-pink/25 flex items-center justify-center shrink-0`}>
      <span className="font-syne font-bold text-saloo-pink">{initial}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function OwnerNav() {
  const pathname = usePathname()
  const router   = useRouter()

  const [profile, setProfile]     = useState<SavedAccount | null>(null)
  const [others, setOthers]       = useState<SavedAccount[]>([])
  const [popoverOpen, setPopover] = useState(false)
  const [switching, setSwitching] = useState(false)

  const desktopRef = useRef<HTMLDivElement>(null)
  const mobileRef  = useRef<HTMLDivElement>(null)

  // On mount: read session, save account with refresh_token
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const meta = session.user.user_metadata

      const { data: profileRow } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      const acc: SavedAccount = {
        id:            session.user.id,
        name:          meta?.full_name ?? meta?.name ?? session.user.email ?? 'Owner',
        email:         session.user.email ?? '',
        role:          profileRow?.role ?? 'customer',
        refresh_token: session.refresh_token,
      }
      setProfile(acc)
      upsertAccount(acc)
      setOthers(readAccounts().filter(a => a.id !== acc.id))
    })
  }, [])

  // Close popover on outside click
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

  // One-click switch: restore session from stored refresh_token
  async function switchAccount(target: SavedAccount) {
    if (switching) return
    setSwitching(true)
    setPopover(false)

    const supabase = createClient()

    // Save current session's latest refresh_token before switching
    const { data: { session: cur } } = await supabase.auth.getSession()
    if (cur && profile) {
      upsertAccount({ ...profile, refresh_token: cur.refresh_token })
    }

    // Restore target session via refresh_token (no password needed)
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: target.refresh_token })

    if (error || !data.session) {
      // Token expired → fall back to login with email pre-filled
      setSwitching(false)
      router.replace(`/login?email=${encodeURIComponent(target.email)}`)
      return
    }

    // Update stored token (Supabase rotates refresh tokens)
    upsertAccount({ ...target, refresh_token: data.session.refresh_token })

    router.replace('/home')
    setSwitching(false)
  }

  // Add account: save current token, go to login fresh
  async function addAccount() {
    setPopover(false)
    const { data: { session } } = await createClient().auth.getSession()
    if (session && profile) upsertAccount({ ...profile, refresh_token: session.refresh_token })
    // Don't sign out — just open login. Supabase will sign in the new account.
    router.replace('/login')
  }

  // Full log out: wipe ALL saved accounts, sign out
  async function logout() {
    setPopover(false)
    localStorage.removeItem(KEY)
    await createClient().auth.signOut()
    router.replace('/login')
  }

  const initial       = profile?.name?.[0]?.toUpperCase() ?? 'O'
  const totalAccounts = 1 + others.length

  // ── Popover panel ─────────────────────────────────────────────────────────
  const PopoverContent = () => (
    <>
      {/* Current account */}
      <div className="px-4 py-3 border-b border-saloo-dark/10">
        <p className="text-saloo-dark/40 text-[10px] uppercase tracking-widest mb-2.5">
          {totalAccounts > 1 ? `${totalAccounts} accounts` : 'Logged in as'}
        </p>
        <div className="flex items-center gap-3">
          <Avatar initial={initial} />
          <div className="flex-1 min-w-0">
            <p className="text-saloo-dark text-sm font-semibold truncate">{profile?.name}</p>
            <p className="text-saloo-dark/60 text-xs truncate">{profile?.email}</p>
          </div>
          <span className="text-saloo-pink text-xs">✓</span>
        </div>
      </div>

      {/* Switch to customer view */}
      <div className="px-3 pt-2 pb-1 border-b border-saloo-dark/10">
        <Link href="/home" onClick={() => setPopover(false)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-saloo-dark/5 hover:bg-saloo-dark/10 text-saloo-dark/70 hover:text-saloo-dark text-sm transition-all">
          <span className="text-base">👤</span>
          Switch to Customer View
        </Link>
      </div>

      {/* Other saved accounts — one-click switch */}
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
                <p className="text-saloo-dark/40 text-xs truncate">{acc.email}</p>
              </div>
              {switching ? (
                <span className="text-saloo-dark/30 text-xs animate-spin">◌</span>
              ) : (
                <span className="text-saloo-dark/30 text-xs">›</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="p-2 space-y-0.5">
        <button onClick={addAccount}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-saloo-dark/5 text-saloo-dark/60 hover:text-saloo-dark text-sm transition-all text-left">
          <span className="w-5 text-center text-base leading-none">+</span>
          Add another account
        </button>
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-500/80 hover:text-red-500 text-sm transition-all text-left">
          <span className="w-5 text-center text-base leading-none">↗</span>
          Log out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-white/80 backdrop-blur-2xl border-r-2 border-[#D60050]/30 shadow-glass-lg fixed left-0 top-0 z-40">
        <div className="px-6 py-6 border-b border-saloo-dark/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-saloo-pink/15 border border-saloo-pink/30 flex items-center justify-center">
              <span className="text-saloo-pink text-xs font-bold">✂</span>
            </div>
            <span className="font-syne font-bold text-saloo-dark text-lg tracking-wide">Saloo</span>
          </div>
          <p className="text-saloo-dark/70 text-xs mt-2 tracking-wide font-medium">Owner Portal</p>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto flex flex-col">
          <div className="flex-1">
            {NAV_ITEMS.map(item => {
              const active = pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 px-5 py-2.5 mx-2 rounded-xl text-sm transition-all ${
                    active ? 'bg-saloo-pink/10 text-saloo-pink border border-saloo-pink/20 shadow-sm' : 'text-saloo-dark/70 hover:text-saloo-dark hover:bg-saloo-dark/5'
                  }`}>
                  <span className={`text-base w-5 text-center ${active ? 'text-saloo-pink' : 'text-saloo-dark/50'}`}>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Customer view switcher — pinned at bottom of nav */}
          <div className="px-2 pt-2 pb-1 border-t border-saloo-dark/10 mt-4">
            <Link href="/home"
              className="flex items-center gap-3 px-5 py-2.5 rounded-xl text-sm text-saloo-dark/70 hover:text-saloo-dark hover:bg-saloo-dark/5 transition-all">
              <span className="text-base w-5 text-center">👤</span>
              <span className="font-medium">Customer View</span>
            </Link>
          </div>
        </nav>

        {/* Desktop profile footer — popover opens upward */}
        <div ref={desktopRef} className="px-4 py-4 border-t border-saloo-dark/5 relative">
          {popoverOpen && (
            <div className="absolute left-2 right-2 bottom-[calc(100%+6px)] z-50 bg-white/90 backdrop-blur-xl border border-saloo-dark/10 rounded-2xl shadow-glass-lg overflow-hidden">
              <PopoverContent />
            </div>
          )}
          <button onClick={() => setPopover(v => !v)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-saloo-dark/5 transition-all text-left">
            <div className="relative">
              <Avatar initial={initial} />
              {totalAccounts > 1 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-saloo-pink text-white text-[8px] font-bold flex items-center justify-center">
                  {totalAccounts}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-saloo-dark text-xs font-semibold truncate">{profile?.name ?? '—'}</p>
              <p className="text-saloo-dark/70 text-[10px] truncate">{profile?.email ?? ''}</p>
            </div>
            <span className={`text-saloo-dark/50 text-xs transition-transform duration-200 ${popoverOpen ? '' : 'rotate-180'}`}>⌃</span>
          </button>
        </div>
      </aside>

      {/* ── Desktop spacer ── */}
      <div className="hidden lg:block w-56 flex-shrink-0" />

      {/* ── Mobile top bar ── */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b-2 border-[#D60050]/30 px-4 pb-2 flex items-center justify-between shadow-sm safe-top">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-saloo-pink/15 border border-saloo-pink/30 flex items-center justify-center">
            <span className="text-saloo-pink text-[10px]">✂</span>
          </div>
          <span className="font-syne font-bold text-saloo-dark text-base">Saloo</span>
          <span className="text-saloo-dark/70 text-xs ml-1 font-medium">Owner</span>
        </div>

        {/* Mobile avatar — popover opens DOWNWARD */}
        <div ref={mobileRef} className="relative">
          <button onClick={() => setPopover(v => !v)} className="relative">
            <Avatar initial={initial} />
            {totalAccounts > 1 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-saloo-pink text-white text-[8px] font-bold flex items-center justify-center">
                {totalAccounts}
              </span>
            )}
          </button>
          {popoverOpen && (
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 bg-white/95 backdrop-blur-xl border border-saloo-dark/10 rounded-2xl shadow-glass-lg overflow-hidden">
              <PopoverContent />
            </div>
          )}
        </div>
      </header>

      {/* ── Mobile bottom nav ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/60 backdrop-blur-3xl border-t border-white/60 shadow-glass-lg">
        <div className="flex overflow-x-auto scrollbar-none">
          {NAV_ITEMS.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center py-3 gap-0.5 transition-all active:scale-95 shrink-0 px-4 ${active ? 'text-saloo-pink' : 'text-saloo-dark/70 hover:text-saloo-dark'}`}>
                <span className="text-2xl font-syne leading-none">{item.icon}</span>
                <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
              </Link>
            )
          })}
          {/* Customer view — always at the end of the scroll strip */}
          <Link href="/home"
            className="flex flex-col items-center py-3 gap-0.5 transition-all active:scale-95 shrink-0 px-4 text-saloo-dark/50 hover:text-saloo-dark border-l border-saloo-dark/10">
            <span className="text-2xl font-syne leading-none">◷</span>
            <span className="text-[10px] font-medium whitespace-nowrap">Customer</span>
          </Link>
        </div>
      </nav>
    </>
  )
}
