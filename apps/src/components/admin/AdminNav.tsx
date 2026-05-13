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
      <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-navy border-r border-white/5 fixed left-0 top-0 z-40">
        <div className="px-6 py-6 border-b border-white/5">
          <span className="text-gold font-bold text-xl" style={{ fontFamily: 'Syne, sans-serif' }}>Saloo</span>
          <p className="text-red-400/70 text-xs mt-0.5 font-medium">Admin Panel</p>
        </div>
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  active
                    ? 'text-red-400 bg-red-400/10 border-r-2 border-red-400'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-base">{item.emoji}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="px-6 py-4 border-t border-white/5 space-y-2">
          <Link href="/owner/dashboard" className="block text-white/30 text-xs hover:text-white/60 transition-colors">
            ← Owner Portal
          </Link>
          <Link href="/home" className="block text-white/30 text-xs hover:text-white/60 transition-colors">
            ← Customer View
          </Link>
        </div>
      </aside>

      {/* Desktop spacer */}
      <div className="hidden lg:block w-56 flex-shrink-0" />

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-navy border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <span className="text-gold font-bold text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>Saloo Admin</span>
        <span className="text-xs text-red-400/70 font-medium bg-red-400/10 px-2 py-0.5 rounded-full">Admin</span>
      </header>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-navy border-t border-white/5 flex justify-around py-2">
        {NAV_ITEMS.slice(0, 5).map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 px-2 py-1">
              <span className="text-xl">{item.emoji}</span>
              <span className={`text-[10px] font-medium ${active ? 'text-red-400' : 'text-white/30'}`}>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
