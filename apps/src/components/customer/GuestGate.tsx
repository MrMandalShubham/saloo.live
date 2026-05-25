'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Wraps protected pages (bookings, alerts, rewards, profile).
 * Shows a "Create Profile" CTA for guests instead of the actual content.
 */
export function GuestGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setIsGuest(!user)
      setChecked(true)
    })
  }, [])

  if (!checked) return null

  if (isGuest) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-saloo-teal/15 border border-saloo-teal/30 flex items-center justify-center mb-6">
          <span className="font-syne text-saloo-teal text-4xl">✂</span>
        </div>
        <h2 className="font-syne font-bold text-2xl text-navy mb-2">
          Profile Required
        </h2>
        <p className="text-gray-500 text-sm max-w-xs mb-6 leading-relaxed">
          Create your Saloo profile to access this section. It&apos;s quick and free!
        </p>
        <button
          onClick={() => router.push('/login')}
          className="bg-saloo-teal text-white font-syne font-bold px-8 py-3 rounded-xl hover:bg-saloo-teal/90 transition-colors text-base shadow-sm"
        >
          Create Profile
        </button>
        <button
          onClick={() => router.push('/home')}
          className="mt-3 text-gray-400 text-sm hover:text-gray-600 transition-colors"
        >
          Back to Home
        </button>
      </div>
    )
  }

  return <>{children}</>
}
