'use client'

import { clearGuestSegment } from '@/lib/segment'

/** Guest-only pill in the home banner: shows the chosen section, tap to re-choose. */
export function GuestSectionSwitch({ isWomen }: { isWomen: boolean }) {
  return (
    <button
      onClick={() => { clearGuestSegment(); window.location.reload() }}
      title="Switch section"
      className="text-[9px] font-bold uppercase tracking-widest bg-white/15 hover:bg-white/25 text-white px-2 py-0.5 rounded-full inline-flex items-center gap-1 transition-colors"
    >
      {isWomen ? '💅 Women' : '💈 Men'}<span className="opacity-60 normal-case font-semibold">· Switch</span>
    </button>
  )
}
