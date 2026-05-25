'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SplashPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<'enter' | 'snip' | 'reveal' | 'exit'>('enter')

  useEffect(() => {
    // Animation timeline
    const t1 = setTimeout(() => setPhase('snip'), 400)
    const t2 = setTimeout(() => setPhase('reveal'), 1200)
    const t3 = setTimeout(() => setPhase('exit'), 2200)

    // Redirect after animation
    const t4 = setTimeout(() => {
      router.replace('/home')
    }, 2800)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [router])

  return (
    <div className={`fixed inset-0 bg-navy flex items-center justify-center z-[9999] transition-opacity duration-500 ${phase === 'exit' ? 'opacity-0' : 'opacity-100'}`}>
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full transition-all duration-1000 ${
          phase === 'enter' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
          style={{ background: 'radial-gradient(circle, rgba(232,90,120,0.15) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-6">
        {/* Scissors */}
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            {/* Left blade */}
            <g className={`origin-[50px_50px] transition-transform duration-500 ease-[cubic-bezier(0.68,-0.55,0.27,1.55)] ${
              phase === 'enter' ? 'rotate-[25deg]' : phase === 'snip' ? 'rotate-[-5deg]' : 'rotate-[10deg]'
            }`}>
              <ellipse cx="30" cy="75" rx="12" ry="14" fill="none" stroke="#E85A78" strokeWidth="3"
                className={`transition-all duration-300 ${phase !== 'enter' ? 'opacity-100' : 'opacity-60'}`} />
              <line x1="38" y1="65" x2="65" y2="30" stroke="#E85A78" strokeWidth="3.5" strokeLinecap="round" />
            </g>
            {/* Right blade */}
            <g className={`origin-[50px_50px] transition-transform duration-500 ease-[cubic-bezier(0.68,-0.55,0.27,1.55)] ${
              phase === 'enter' ? 'rotate-[-25deg]' : phase === 'snip' ? 'rotate-[5deg]' : 'rotate-[-10deg]'
            }`}>
              <ellipse cx="70" cy="75" rx="12" ry="14" fill="none" stroke="#5EEAD4" strokeWidth="3"
                className={`transition-all duration-300 ${phase !== 'enter' ? 'opacity-100' : 'opacity-60'}`} />
              <line x1="62" y1="65" x2="35" y2="30" stroke="#5EEAD4" strokeWidth="3.5" strokeLinecap="round" />
            </g>
            {/* Pivot screw */}
            <circle cx="50" cy="50" r="4" fill="#E85A78"
              className={`transition-all duration-300 ${phase === 'snip' ? 'scale-110' : 'scale-100'}`}
              style={{ transformOrigin: '50px 50px' }} />
            {/* Snip spark effect */}
            {phase === 'snip' && (
              <>
                <circle cx="50" cy="30" r="2" fill="#5EEAD4" className="animate-ping" />
                <circle cx="55" cy="28" r="1.5" fill="#E85A78" className="animate-ping" style={{ animationDelay: '100ms' }} />
                <circle cx="45" cy="28" r="1.5" fill="#FDE68A" className="animate-ping" style={{ animationDelay: '200ms' }} />
              </>
            )}
          </svg>
        </div>

        {/* Brand name */}
        <div className="flex items-center gap-0 overflow-hidden">
          {'SALOO'.split('').map((letter, i) => (
            <span
              key={i}
              className={`font-syne text-4xl sm:text-5xl font-bold tracking-wider transition-all duration-500 ${
                phase === 'enter'
                  ? 'opacity-0 translate-y-8'
                  : phase === 'snip'
                    ? 'opacity-0 translate-y-4'
                    : 'opacity-100 translate-y-0'
              }`}
              style={{
                color: i < 3 ? '#E85A78' : '#5EEAD4',
                transitionDelay: `${(phase === 'reveal' ? i * 80 : 0)}ms`,
              }}
            >
              {letter}
            </span>
          ))}
        </div>

        {/* Tagline */}
        <p className={`text-white/40 text-sm font-light tracking-[0.3em] uppercase transition-all duration-700 ${
          phase === 'reveal' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
          style={{ transitionDelay: '400ms' }}
        >
          Book Your Barber
        </p>

        {/* Loading dots */}
        <div className={`flex gap-1.5 transition-opacity duration-300 ${phase === 'reveal' ? 'opacity-100' : 'opacity-0'}`}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-saloo-pink/60"
              style={{
                animation: phase === 'reveal' ? `pulse 1s ease-in-out ${i * 200}ms infinite` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
      `}</style>
    </div>
  )
}
