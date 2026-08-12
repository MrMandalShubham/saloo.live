'use client'

import { useEffect, useState } from 'react'
import { enablePush, getPushState, type PushState } from '@/lib/push'

/** "Turn on notifications" banner. Renders only when opt-in is actually possible. */
export function PushOptIn() {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { setState(getPushState()) }, [])

  // Hide when not usable or already granted (nothing for the user to do)
  if (state === null || state === 'unsupported' || state === 'unconfigured' || state === 'granted') return null

  async function turnOn() {
    setBusy(true); setMsg('')
    const res = await enablePush()
    setBusy(false)
    if (res.ok) setState('granted')
    else setMsg(res.error ?? 'Could not enable notifications.')
  }

  return (
    <div className="bg-gradient-to-br from-[#0A1116] to-[#0E1B24] border border-white/10 rounded-2xl p-4 flex items-center gap-3">
      <div className="text-2xl shrink-0">🔔</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm">Turn on notifications</p>
        <p className="text-white/60 text-xs mt-0.5">
          {state === 'denied'
            ? 'Blocked — enable notifications for this site in your browser settings.'
            : 'Get booking updates, reminders & offers on this device.'}
        </p>
        {msg && <p className="text-red-300 text-xs mt-1">{msg}</p>}
      </div>
      {state === 'default' && (
        <button
          onClick={turnOn}
          disabled={busy}
          className="shrink-0 bg-saloo-teal text-navy font-syne font-bold text-xs px-4 py-2 rounded-xl hover:bg-saloo-teal/90 disabled:opacity-50 transition-colors"
        >
          {busy ? 'Enabling…' : 'Enable'}
        </button>
      )}
    </div>
  )
}
