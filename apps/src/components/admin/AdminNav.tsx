'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', emoji: '🏠' },
  { label: 'Shops', href: '/admin/shops', emoji: '🏪' },
  { label: 'Users', href: '/admin/users', emoji: '👤' },
  { label: 'Disputes', href: '/admin/disputes', emoji: '⚖️' },
  { label: 'Analytics', href: '/admin/analytics', emoji: '📈' },
  { label: 'Notifications', href: '/admin/notifications', emoji: '📢' },
  { label: 'Settings', href: '/admin/settings', emoji: '⚙️' },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-white/80 backdrop-blur-3xl border-r border-zinc-200/50 shadow-sm fixed left-0 top-0 z-40">
        <div className="px-6 py-6 border-b border-saloo-dark/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center">
              <span className="text-gold text-[10px] font-bold">🛡️</span>
            </div>
            <span className="font-syne font-bold text-saloo-dark text-lg tracking-wide">Saloo</span>
          </div>
          <p className="text-saloo-dark/70 text-xs mt-2 tracking-wide font-medium">Admin Portal</p>
        </div>
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-5 py-2.5 mx-2 rounded-xl text-sm transition-all ${
                  active ? 'bg-gold/10 text-gold border border-gold/20 shadow-sm' : 'text-saloo-dark/70 hover:text-saloo-dark hover:bg-saloo-dark/5'
                }`}>
                <span className={`text-base w-5 text-center ${active ? 'opacity-100 text-gold' : 'opacity-70 grayscale text-saloo-dark/50'}`}>{item.emoji}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="px-6 py-4 border-t border-saloo-dark/10 space-y-2">
          <Link href="/owner/dashboard" className="block text-saloo-dark/50 text-xs hover:text-saloo-dark transition-colors">
            ← Owner Portal
          </Link>
          <Link href="/home" className="block text-saloo-dark/50 text-xs hover:text-saloo-dark transition-colors">
            ← Customer View
          </Link>
        </div>
      </aside>

      {/* Desktop spacer */}
      <div className="hidden lg:block w-56 flex-shrink-0" />

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-3xl border-b border-zinc-200/50 px-4 h-14 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center">
            <span className="text-gold text-[10px]">🛡️</span>
          </div>
          <span className="font-syne font-bold text-saloo-dark text-base">Saloo</span>
          <span className="text-saloo-dark/70 text-xs ml-1 font-medium">Admin</span>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-3xl border-t border-zinc-200/50 shadow-glass-lg">
        <div className="flex overflow-x-auto scrollbar-none">
          {NAV_ITEMS.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center py-3 gap-0.5 transition-all active:scale-95 shrink-0 px-4 ${active ? 'text-gold' : 'text-saloo-dark/70 hover:text-saloo-dark'}`}>
                <span className={`text-xl ${active ? 'opacity-100' : 'opacity-60 grayscale'}`}>{item.emoji}</span>
                <span className={`text-[10px] font-medium whitespace-nowrap ${active ? 'text-gold' : 'text-saloo-dark/50'}`}>{item.label}</span>
              </Link>
            )
          })}
          {/* Customer view — always at the end of the scroll strip */}
          <Link href="/home"
            className="flex flex-col items-center py-3 gap-0.5 transition-all active:scale-95 shrink-0 px-4 text-saloo-dark/50 hover:text-saloo-dark border-l border-saloo-dark/10">
            <span className="text-xl opacity-60 grayscale">👤</span>
            <span className="text-[10px] font-medium whitespace-nowrap">Customer</span>
          </Link>
        </div>
      </nav>
    </>
  )
}
