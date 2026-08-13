'use client'

import { clearGuestSegment } from '@/lib/segment'

/** Guest-only pill in the home banner: shows the chosen section, tap to re-choose. */
export function GuestSectionSwitch({ isWomen }: { isWomen: boolean }) {
  return (
    <button
      onClick={() => { clearGuestSegment(); window.location.reload() }}
      title="Switch section"
      className="text-[9px] font-bold uppercase tracking-widest bg-navy/5 hover:bg-navy/10 text-navy border border-border px-2 py-0.5 rounded-full inline-flex items-center gap-1 transition-colors"
    >
      {isWomen ? '💅 Women' : '💈 Men'}<span className="opacity-50 normal-case font-semibold">· Switch</span>
    </button>
  )
}
