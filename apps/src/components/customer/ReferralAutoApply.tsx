'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPendingReferral, clearPendingReferral } from '@/lib/referral'

const BASE = process.env['NEXT_PUBLIC_SUPABASE_URL']

/** Applies a pending ?ref= referral code once the user is signed in. Renders nothing. */
export function ReferralAutoApply() {
  useEffect(() => {
    const code = getPendingReferral()
    if (!code) return
    ;(async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return // not signed in yet — keep the code for the next authenticated load
      try {
        await fetch(`${BASE}/functions/v1/referral-apply`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        // Clear on any definitive server response — success, or a validation error
        // (already referred / own code / already booked). Only a network throw keeps it.
        clearPendingReferral()
      } catch { /* network error → keep code, retry on next load */ }
    })()
  }, [])
  return null
}
