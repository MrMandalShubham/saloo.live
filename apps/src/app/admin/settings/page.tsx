'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminSettingsPage() {
  const supabase = createClient()
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-saloo-dark text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Admin Settings</h1>
        <p className="text-saloo-dark/60 text-sm mt-1">Platform configuration and account</p>
      </div>

      <div className="space-y-3">
        {[
          { label: 'Platform Name', value: 'Saloo — Online Barber Booking' },
          { label: 'Support Email', value: 'support@saloo.in' },
          { label: 'Razorpay Mode', value: 'Test (Switch to Live in Razorpay Dashboard)' },
          { label: 'FCM Status', value: 'Active' },
          { label: 'MSG91 Status', value: 'Active' },
        ].map(row => (
          <div key={row.label} className="bg-white/60 backdrop-blur-md shadow-sm rounded-xl px-5 py-4 border border-white/80 flex justify-between items-center">
            <p className="text-saloo-dark/60 text-sm">{row.label}</p>
            <p className="text-saloo-dark/90 text-sm font-medium">{row.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white/60 backdrop-blur-md shadow-sm rounded-2xl p-5 border border-white/80 space-y-3">
        <h2 className="text-saloo-dark/80 text-xs font-medium uppercase tracking-wide">Quick Links</h2>
        {[
          { label: 'Supabase Dashboard', href: '#' },
          { label: 'Razorpay Dashboard', href: '#' },
          { label: 'Firebase Console', href: '#' },
          { label: 'MSG91 Dashboard', href: '#' },
        ].map(link => (
          <a key={link.label} href={link.href} className="block text-saloo-dark/80 text-sm hover:text-saloo-dark transition-colors py-1">
            {link.label} →
          </a>
        ))}
      </div>

      <button
        onClick={handleSignOut}
        className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-bold py-3 rounded-xl text-sm hover:bg-red-500/20 transition-colors"
      >
        Sign Out
      </button>
    </div>
  )
}
