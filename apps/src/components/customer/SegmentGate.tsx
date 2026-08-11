'use client'

import { setGuestSegment, type Segment } from '@/lib/segment'

const OPTIONS: { key: Segment; emoji: string; title: string; sub: string }[] = [
  { key: 'men', emoji: '💈', title: "Men's Grooming", sub: 'Barbers, fades, beards & classic shaves' },
  { key: 'women', emoji: '💅', title: "Women's Beauty", sub: 'Salons, facials, waxing & bridal' },
]

/** Full-screen section chooser shown to guests before they browse. */
export function SegmentGate() {
  function choose(seg: Segment) {
    setGuestSegment(seg)
    window.location.reload() // re-run the server layout, which now lets them through
  }

  return (
    <div className="min-h-screen bg-royal-gradient flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute top-1/4 right-0 w-72 h-72 rounded-full bg-gold/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-saloo-teal/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 text-center">
        {/* Logo */}
        <div className="inline-flex flex-col items-center gap-2 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gold/15 border border-gold/40 flex items-center justify-center">
            <span className="font-syne font-bold text-gold text-2xl">✂</span>
          </div>
          <span className="font-syne text-3xl font-bold text-white tracking-wide">LooksOn</span>
        </div>

        <h1 className="font-syne text-2xl font-bold text-white">Who are you shopping for?</h1>
        <p className="text-white/50 text-sm mt-1.5 mb-8">Pick a section to explore. You can switch anytime.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => choose(o.key)}
              className="group bg-white/[0.07] hover:bg-white/[0.12] border border-white/15 hover:border-gold/50 rounded-2xl p-6 flex flex-col items-center gap-3 transition-all active:scale-[0.98]"
            >
              <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{o.emoji}</span>
              <span className="font-syne font-bold text-white text-lg">{o.title}</span>
              <span className="text-white/50 text-xs leading-snug">{o.sub}</span>
            </button>
          ))}
        </div>

        <p className="text-white/30 text-xs mt-8">
          Have an account?{' '}
          <a href="/login" className="text-gold/80 hover:text-gold font-semibold">Sign in</a>
        </p>
      </div>
    </div>
  )
}
