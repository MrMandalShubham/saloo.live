'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

/* ─── Hooks ──────────────────────────────────────────────────────────── */

function useInView(threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

function useCountUp(to: number, suffix: string, active: boolean, duration = 1600) {
  const [val, setVal] = useState('0')
  useEffect(() => {
    if (!active) return
    const start = Date.now()
    const frame = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.floor(eased * to) + suffix)
      if (p < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [active, to, suffix, duration])
  return val
}

/* ─── Data ───────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    title: 'Discover Nearby',
    desc: 'Find verified barbershops near you with live availability, real ratings, and photos.',
    accent: 'luxe-blue',
    accentBg: 'bg-luxe-blue/10',
    accentBorder: 'group-hover:border-luxe-blue',
    accentIcon: 'group-hover:bg-luxe-blue group-hover:border-luxe-blue',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: 'Instant Booking',
    desc: 'Pick your barber, choose a slot, pay just 30% advance — done in under 60 seconds.',
    accent: 'luxe-amber',
    accentBg: 'bg-luxe-amber/10',
    accentBorder: 'group-hover:border-luxe-amber',
    accentIcon: 'group-hover:bg-luxe-amber group-hover:border-luxe-amber',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Walk Straight In',
    desc: 'Arrive on time, skip the queue entirely, and go straight to the chair.',
    accent: 'luxe-teal',
    accentBg: 'bg-luxe-teal/10',
    accentBorder: 'group-hover:border-luxe-teal',
    accentIcon: 'group-hover:bg-luxe-teal group-hover:border-luxe-teal',
  },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Find a Shop', desc: 'Browse verified barbers near you with real-time availability and honest reviews.', color: 'text-luxe-blue' },
  { step: '02', title: 'Choose Your Slot', desc: 'Pick your barber and time. Pay just 30% advance to lock in your appointment.', color: 'text-luxe-amber' },
  { step: '03', title: 'Walk In Stress-Free', desc: 'Arrive on time and go straight to the chair — no waiting, ever.', color: 'text-luxe-teal' },
]

const TESTIMONIALS = [
  { name: 'Arjun S.', city: 'Mumbai', text: 'No more waiting 40 minutes at the barber. Saloo changed my entire routine.', rating: 5 },
  { name: 'Priya R.', city: 'Bangalore', text: 'Booked my husband a slot in under a minute. He walked in, got done, left. Perfect.', rating: 5 },
  { name: 'Rohit M.', city: 'Delhi', text: 'The advance pay idea is genius. Barber is always ready when I arrive.', rating: 5 },
]

const SLOTS = ['10:00', '11:30', '02:00', '04:30']

/* ─── Booking Mockup ─────────────────────────────────────────────────── */

function BookingMockup() {
  const [active, setActive] = useState(1)
  useEffect(() => {
    const t = setInterval(() => setActive(s => (s + 1) % SLOTS.length), 2200)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="relative w-80 select-none">
      <div className="bg-luxe-cream backdrop-blur-xl border border-luxe-taupe/30 p-6 shadow-luxe-lg rounded-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-luxe-burgundy to-luxe-rose flex items-center justify-center shrink-0">
            <span className="font-playfair font-black text-luxe-ivory text-xl italic">S</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-playfair font-black text-luxe-espresso text-lg tracking-wide leading-tight">Style Studio</p>
            <p className="text-luxe-espresso/40 text-xs uppercase tracking-widest font-bold">Bandra West · 4.9★</p>
          </div>
          <span className="bg-luxe-teal/15 border border-luxe-teal/30 text-luxe-teal text-[10px] font-black uppercase tracking-tighter px-2.5 py-1 rounded-full shrink-0">Available</span>
        </div>

        <div className="bg-gradient-to-r from-luxe-burgundy/5 to-luxe-amber/5 border border-luxe-taupe/20 p-4 mb-6">
          <p className="text-[10px] text-luxe-espresso/40 uppercase tracking-[0.2em] font-bold mb-1">Selected Essence</p>
          <p className="font-playfair font-bold text-luxe-espresso text-base">Signature Cut & Beard Sculpt</p>
          <p className="text-luxe-burgundy text-xs font-medium mt-1">₹1,299 · 60 min</p>
        </div>

        <p className="text-[10px] text-luxe-espresso/40 mb-3 font-bold uppercase tracking-[0.2em]">Curated Slots</p>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {SLOTS.map((slot, i) => (
            <button
              key={slot}
              onClick={() => setActive(i)}
              className={`py-2.5 text-xs font-bold transition-all duration-500 border rounded-sm ${
                active === i ? 'bg-luxe-midnight text-luxe-ivory border-luxe-midnight scale-105 shadow-luxe' : 'bg-transparent text-luxe-espresso/40 border-luxe-taupe/30 hover:border-luxe-taupe hover:text-luxe-espresso'
              }`}
            >
              {slot}
            </button>
          ))}
        </div>

        <button className="w-full bg-gradient-to-r from-luxe-midnight via-luxe-espresso to-luxe-burgundy text-luxe-ivory font-playfair font-black py-4 text-sm uppercase tracking-widest shadow-luxe hover:shadow-luxe-lg transition-all active:scale-95 rounded-sm">
          Reserve Now
        </button>
      </div>

      <div className="absolute -top-4 -right-4 bg-gradient-to-r from-luxe-burgundy to-luxe-rose text-luxe-ivory text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-luxe-lg flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-luxe-ivory animate-pulse" />
        Reserved
      </div>

      <div className="absolute -bottom-6 -left-6 bg-luxe-cream border border-luxe-taupe/30 shadow-luxe-lg p-4 flex items-center gap-3 rounded-sm">
        <div className="w-10 h-10 rounded-full bg-luxe-amber/15 border border-luxe-amber/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-luxe-amber" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
          </svg>
        </div>
        <div>
          <p className="font-playfair font-black text-luxe-espresso text-base leading-none">4.9 / 5.0</p>
          <p className="text-luxe-espresso/40 text-[10px] uppercase tracking-widest mt-1">Excellence Rated</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Stat Card ──────────────────────────────────────────────────────── */

function StatCard({ value, label, inView, isStatic, color }: { value: string; label: string; inView: boolean; isStatic?: boolean; color: string }) {
  const numMatch = value.match(/^(\d+)(\D.*)$|^(\d+)([+])$/)
  const num = numMatch ? parseInt(numMatch[1] ?? numMatch[3]) : 0
  const suffix = numMatch ? (numMatch[2] ?? numMatch[4] ?? '') : ''
  const count = useCountUp(num, suffix, inView && !isStatic)
  return (
    <div className="text-center p-6 sm:p-8">
      <div className={`font-playfair text-4xl sm:text-6xl font-black tabular-nums tracking-tighter ${color}`}>
        {isStatic ? value : (inView ? count : `0${suffix}`)}
      </div>
      <div className="text-luxe-espresso/50 text-xs sm:text-sm mt-3 font-bold uppercase tracking-[0.2em]">{label}</div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [activeStep, setActiveStep] = useState(0)

  const statsSection        = useInView()
  const featuresSection     = useInView()
  const howSection          = useInView()
  const ownerSection        = useInView()
  const testimonialsSection = useInView()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setActiveStep(s => (s + 1) % HOW_IT_WORKS.length), 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen bg-luxe-ivory overflow-x-hidden selection:bg-luxe-burgundy/20 selection:text-luxe-espresso">

      {/* ── Navbar ───────────────────────────────────────────────────── */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-luxe-ivory/90 border-b border-luxe-taupe/30 shadow-luxe backdrop-blur-xl' : 'bg-transparent border-b border-transparent'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-luxe-burgundy to-luxe-rose flex items-center justify-center group-hover:shadow-luxe transition-all">
              <span className="font-playfair font-black text-luxe-ivory text-sm">S</span>
            </div>
            <span className="font-playfair text-2xl font-bold text-luxe-espresso tracking-widest uppercase">Saloo</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/search" className="hidden sm:block text-luxe-espresso/70 hover:text-luxe-espresso text-sm font-bold tracking-widest uppercase px-3 py-1.5 transition-all">Find Shops</Link>
            <Link href="/login" className="hidden sm:block text-luxe-espresso/70 hover:text-luxe-espresso text-sm font-bold tracking-widest uppercase px-3 py-1.5 transition-all">Sign In</Link>
            <Link href="/login" className="bg-gradient-to-r from-luxe-midnight to-luxe-espresso text-luxe-ivory px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:shadow-luxe-lg transition-all rounded-sm">
              Book Now
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0 bg-luxe-hero" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-luxe-blue/15 blur-[100px]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-luxe-amber/12 blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-luxe-violet/8 blur-[150px]" />
        </div>
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#EFE9E1 1px, transparent 1px), linear-gradient(90deg, #EFE9E1 1px, transparent 1px)', backgroundSize: '80px 80px' }} />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

            <div className="flex-1 text-center lg:text-left max-w-2xl">
              <div className="inline-flex items-center gap-3 border border-luxe-taupe/30 bg-white/5 backdrop-blur-sm text-luxe-amber text-xs px-4 py-2 uppercase tracking-[0.2em] font-bold mb-8 animate-fade-up rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-luxe-amber animate-pulse" />
                India&apos;s Premier Barber Platform
              </div>

              <h1 className="font-playfair text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-black text-luxe-ivory leading-[1.05] mb-8 text-balance animate-fade-up" style={{ animationDelay: '0.1s' }}>
                Book Your Barber,{' '}
                <br className="hidden md:block" />
                <span className="relative inline-block mt-2">
                  <span className="bg-gradient-to-r from-luxe-amber via-luxe-rose to-luxe-burgundy bg-clip-text text-transparent italic">Walk Straight In</span>
                  <div className="absolute -bottom-2 left-0 w-full h-[2px] bg-gradient-to-r from-luxe-amber to-luxe-burgundy opacity-40" />
                </span>
              </h1>

              <p className="text-luxe-stone text-base sm:text-lg max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed font-light animate-fade-up" style={{ animationDelay: '0.2s' }}>
                Find top-rated barbers near you, book in 60 seconds with just 30% advance, and skip the queue — forever.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-up" style={{ animationDelay: '0.3s' }}>
                <Link href="/login" className="bg-gradient-to-r from-luxe-amber to-luxe-rose text-luxe-charcoal px-10 py-5 font-playfair font-black text-lg sm:text-xl hover:shadow-luxe-lg transition-all flex items-center justify-center gap-2 tracking-wide rounded-sm">
                  Book Online →
                </Link>
                <Link href="/search" className="border border-luxe-taupe/30 text-luxe-ivory px-10 py-5 font-medium text-base sm:text-lg hover:bg-white/5 transition-all flex items-center justify-center tracking-wide rounded-sm backdrop-blur-sm">
                  Explore Shops
                </Link>
              </div>

              <div className="flex items-center gap-6 mt-10 justify-center lg:justify-start animate-fade-up" style={{ animationDelay: '0.4s' }}>
                {['Free to join', 'Instant confirmation', 'No hidden fees'].map(t => (
                  <div key={t} className="flex items-center gap-2 text-luxe-stone/60 text-xs font-bold uppercase tracking-widest">
                    <svg className="w-3.5 h-3.5 text-luxe-teal" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-shrink-0 flex justify-center items-center animate-fade-up" style={{ animationDelay: '0.35s' }}>
              <BookingMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <section className="bg-luxe-cream border-y border-luxe-taupe/20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full bg-luxe-blue/5 blur-[80px]" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-luxe-amber/8 blur-[80px]" />
        </div>
        <div ref={statsSection.ref} className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 relative z-10">
          <div className="grid grid-cols-3 gap-2 sm:gap-6">
            <StatCard value="500+" label="Verified Barbershops" inView={statsSection.inView} color="text-luxe-blue" />
            <StatCard value="50K+" label="Happy Customers" inView={statsSection.inView} color="text-luxe-amber" />
            <StatCard value="4.9★" label="Avg Rating" inView={statsSection.inView} isStatic color="text-luxe-rose" />
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-luxe-ivory relative overflow-hidden">
        <div className="absolute top-40 right-0 w-96 h-96 rounded-full bg-luxe-blue/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-20 left-0 w-80 h-80 rounded-full bg-luxe-amber/8 blur-[100px] pointer-events-none" />

        <div ref={featuresSection.ref} className={`max-w-5xl mx-auto transition-all duration-700 relative z-10 ${featuresSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="text-center mb-16 sm:mb-24">
            <span className="text-xs font-bold text-luxe-blue tracking-[0.3em] uppercase">The Experience</span>
            <h2 className="font-playfair text-4xl sm:text-5xl md:text-6xl font-bold text-luxe-espresso mt-4 text-balance">The Art of Fine Grooming</h2>
            <p className="text-luxe-espresso/60 text-base sm:text-lg mt-6 max-w-2xl mx-auto font-light leading-relaxed">Elevating your routine through curated barbers, seamless booking, and a commitment to your time.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`group relative bg-luxe-cream border border-luxe-taupe/30 p-8 sm:p-10 hover:shadow-luxe-lg transition-all duration-500 ${f.accentBorder}`} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="relative z-10">
                  <div className={`w-16 h-16 rounded-full ${f.accentBg} border border-luxe-taupe/20 flex items-center justify-center mb-8 text-luxe-espresso/60 ${f.accentIcon} group-hover:text-luxe-ivory transition-all duration-500`}>{f.icon}</div>
                  <h3 className="font-playfair font-bold text-2xl text-luxe-espresso mb-4 tracking-wide">{f.title}</h3>
                  <p className="text-luxe-espresso/60 text-sm leading-relaxed font-light">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section className="bg-luxe-dark-gradient py-20 sm:py-28 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-luxe-violet/10 blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-luxe-blue/10 blur-[100px]" />
        </div>
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#EFE9E1 1px, transparent 1px), linear-gradient(90deg, #EFE9E1 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div ref={howSection.ref} className={`max-w-5xl mx-auto transition-all duration-700 relative z-10 ${howSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="text-center mb-16 sm:mb-24">
            <span className="text-xs font-bold text-luxe-amber tracking-[0.3em] uppercase">The Process</span>
            <h2 className="font-playfair text-4xl sm:text-5xl font-bold text-luxe-ivory mt-4">Simplicity Refined</h2>
            <p className="text-luxe-stone/60 text-base mt-4 max-w-lg mx-auto font-light">Three effortless steps to your perfect grooming experience.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            {HOW_IT_WORKS.map((s, i) => (
              <button
                key={s.step}
                onClick={() => setActiveStep(i)}
                className={`text-left p-8 sm:p-10 border transition-all duration-500 rounded-sm ${
                  activeStep === i
                    ? 'bg-white/5 backdrop-blur-sm border-luxe-amber/40 shadow-luxe-lg'
                    : 'bg-transparent border-luxe-taupe/10 hover:bg-white/[0.02] hover:border-luxe-taupe/20'
                }`}
              >
                <div className={`w-12 h-12 rounded-full border flex items-center justify-center mb-6 transition-all duration-300 ${
                  activeStep === i ? 'border-luxe-amber/40 bg-luxe-amber/10' : 'border-luxe-taupe/20 bg-transparent'
                }`}>
                  <span className={`font-playfair text-sm font-black transition-colors ${activeStep === i ? s.color : 'text-luxe-stone/30'}`}>{s.step}</span>
                </div>
                <h3 className={`font-playfair font-bold text-xl mb-3 tracking-wide transition-colors ${activeStep === i ? 'text-luxe-ivory' : 'text-luxe-stone/40'}`}>{s.title}</h3>
                <p className={`text-sm leading-relaxed font-light transition-colors ${activeStep === i ? 'text-luxe-stone/70' : 'text-luxe-stone/25'}`}>{s.desc}</p>
              </button>
            ))}
          </div>

          <div className="flex justify-center gap-3 mt-10">
            {HOW_IT_WORKS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${activeStep === i ? 'bg-luxe-amber w-8' : 'bg-luxe-taupe/20 w-4 hover:bg-luxe-taupe/40'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Shop Owners ──────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-luxe-ivory relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-luxe-taupe/30 to-transparent" />
        <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-luxe-violet/5 blur-[100px] pointer-events-none" />

        <div ref={ownerSection.ref} className={`max-w-6xl mx-auto transition-all duration-700 ${ownerSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="bg-gradient-to-br from-luxe-midnight via-luxe-charcoal to-luxe-espresso p-10 sm:p-16 lg:p-20 relative overflow-hidden flex flex-col lg:flex-row items-center gap-12 lg:gap-24 rounded-sm">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-luxe-amber/10 blur-[80px]" />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-luxe-burgundy/10 blur-[60px]" />
            </div>
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
              style={{ backgroundImage: 'linear-gradient(#EFE9E1 1px, transparent 1px), linear-gradient(90deg, #EFE9E1 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

            <div className="relative z-10 flex-1">
              <span className="text-xs font-bold text-luxe-amber tracking-[0.3em] uppercase mb-4 block">For Partners</span>
              <h2 className="font-playfair text-4xl sm:text-5xl md:text-6xl font-bold text-luxe-ivory mb-6 leading-[1.1] text-balance">
                Elevate Your <br className="hidden sm:block" /> Business Identity
              </h2>
              <p className="text-luxe-stone/70 text-base sm:text-lg leading-relaxed mb-10 max-w-xl font-light">
                Saloo provides the digital infrastructure for world-class grooming establishments. Manage with precision, grow with purpose.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  { text: 'Smart calendar & availability management', icon: '📅' },
                  { text: 'Advance payment collection — no no-shows', icon: '💰' },
                  { text: 'Customer ratings & review management', icon: '⭐' },
                  { text: 'Analytics dashboard to track growth', icon: '📊' },
                ].map(item => (
                  <li key={item.text} className="flex items-center gap-4 text-luxe-ivory/80 text-sm">
                    <span className="w-8 h-8 rounded-full bg-luxe-amber/10 border border-luxe-amber/20 flex items-center justify-center text-sm shrink-0">{item.icon}</span>
                    {item.text}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="inline-flex items-center justify-center bg-gradient-to-r from-luxe-amber to-luxe-rose text-luxe-charcoal px-10 py-5 font-playfair font-black text-sm uppercase tracking-widest hover:shadow-luxe-lg transition-all w-full sm:w-auto rounded-sm">
                Partner with Us →
              </Link>
            </div>

            <div className="relative z-10 flex-shrink-0 grid grid-cols-2 gap-3 w-full max-w-sm">
              {[
                { label: 'Bookings Today', value: '24', color: 'from-luxe-blue/20 to-luxe-blue/5', accent: 'text-luxe-blue', trend: '+12%' },
                { label: 'Revenue', value: '₹8.4K', color: 'from-luxe-amber/20 to-luxe-amber/5', accent: 'text-luxe-amber', trend: '+18%' },
                { label: 'Avg Rating', value: '4.9★', color: 'from-luxe-rose/20 to-luxe-rose/5', accent: 'text-luxe-rose', trend: '' },
                { label: 'New Customers', value: '31', color: 'from-luxe-teal/20 to-luxe-teal/5', accent: 'text-luxe-teal', trend: '+9%' },
              ].map(stat => (
                <div key={stat.label} className={`bg-gradient-to-br ${stat.color} backdrop-blur-sm border border-white/5 p-6 sm:p-8 flex flex-col justify-between rounded-sm`}>
                  <div>
                    <div className={`font-playfair font-black text-luxe-ivory text-2xl mb-1`}>{stat.value}</div>
                    <div className="text-luxe-stone/50 text-xs uppercase tracking-widest font-bold">{stat.label}</div>
                    {stat.trend && <div className={`${stat.accent} text-xs font-bold mt-2`}>{stat.trend}</div>}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-luxe-cream relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-luxe-taupe/30 to-transparent" />
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-luxe-violet/5 blur-[100px] pointer-events-none" />

        <div ref={testimonialsSection.ref} className={`max-w-6xl mx-auto transition-all duration-700 relative z-10 ${testimonialsSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="text-center mb-16 sm:mb-20">
            <span className="text-xs font-bold text-luxe-violet tracking-[0.3em] uppercase">Testimonials</span>
            <h2 className="font-playfair text-4xl sm:text-5xl font-bold text-luxe-espresso mt-4">Client Voices</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {TESTIMONIALS.map((t, i) => {
              const colors = ['border-luxe-blue/20 hover:border-luxe-blue/40', 'border-luxe-amber/20 hover:border-luxe-amber/40', 'border-luxe-violet/20 hover:border-luxe-violet/40']
              const starColors = ['text-luxe-blue', 'text-luxe-amber', 'text-luxe-violet']
              const avatarBg = ['bg-luxe-blue/15 text-luxe-blue', 'bg-luxe-amber/15 text-luxe-amber', 'bg-luxe-violet/15 text-luxe-violet']
              return (
                <div key={i} className={`bg-luxe-ivory border ${colors[i]} p-8 sm:p-10 relative group hover:shadow-luxe-lg transition-all duration-300`}>
                  <div className="text-luxe-taupe/20 text-6xl font-playfair font-black absolute top-4 right-6 leading-none">&ldquo;</div>
                  <div className={`flex ${starColors[i]} text-sm mb-6`}>
                    {[...Array(t.rating)].map((_, j) => (
                      <svg key={j} className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-luxe-espresso/70 leading-relaxed font-light mb-8 text-sm sm:text-base relative z-10">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-4 mt-auto">
                    <div className={`w-11 h-11 rounded-full ${avatarBg[i]} flex items-center justify-center font-playfair font-bold text-sm`}>
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-playfair font-bold text-luxe-espresso">{t.name}</div>
                      <div className="text-luxe-espresso/40 text-xs font-bold tracking-widest uppercase">{t.city}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-luxe-hero py-24 sm:py-32 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/4 w-96 h-96 rounded-full bg-luxe-rose/15 blur-[120px]" />
          <div className="absolute bottom-10 right-1/4 w-72 h-72 rounded-full bg-luxe-amber/12 blur-[100px]" />
        </div>
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#EFE9E1 1px, transparent 1px), linear-gradient(90deg, #EFE9E1 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="text-xs font-bold text-luxe-amber tracking-[0.3em] uppercase mb-6 block">Get Started</span>
          <h2 className="font-playfair text-5xl sm:text-6xl md:text-7xl font-bold text-luxe-ivory mb-8">
            Ready for a <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-luxe-amber via-luxe-rose to-luxe-stone bg-clip-text text-transparent italic font-light">Better Grooming Experience?</span>
          </h2>
          <p className="text-luxe-stone/50 text-lg sm:text-xl mb-12 max-w-2xl mx-auto font-light">
            Join the platform that respects your time. Book your next haircut in 60 seconds and walk straight to the chair.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="bg-gradient-to-r from-luxe-amber to-luxe-rose text-luxe-charcoal px-10 py-5 font-playfair font-black text-lg hover:shadow-luxe-lg transition-all tracking-wide rounded-sm">
              Book Your Slot
            </Link>
            <Link href="/search" className="border border-luxe-taupe/30 text-luxe-ivory px-10 py-5 font-medium text-lg hover:bg-white/5 transition-all tracking-wide rounded-sm backdrop-blur-sm">
              Find a Barber
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-luxe-ivory border-t border-luxe-taupe/20 pt-20 pb-10 px-4 sm:px-6 relative z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-6 group inline-flex">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-luxe-burgundy to-luxe-rose flex items-center justify-center group-hover:shadow-luxe transition-all">
                <span className="font-playfair font-black text-luxe-ivory text-sm">S</span>
              </div>
              <span className="font-playfair text-2xl font-bold text-luxe-espresso tracking-widest uppercase">Saloo</span>
            </Link>
            <p className="text-luxe-espresso/50 text-sm font-light leading-relaxed max-w-xs">
              The premier platform for high-end grooming, respecting both the barber&apos;s craft and the client&apos;s time.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-luxe-espresso uppercase tracking-[0.2em] text-xs mb-6">Platform</h4>
            <ul className="space-y-4">
              <li><Link href="/search" className="text-luxe-espresso/60 hover:text-luxe-burgundy text-sm transition-colors">Find a Shop</Link></li>
              <li><Link href="/login" className="text-luxe-espresso/60 hover:text-luxe-burgundy text-sm transition-colors">Partner Login</Link></li>
              <li><Link href="#" className="text-luxe-espresso/60 hover:text-luxe-burgundy text-sm transition-colors">How it Works</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-luxe-espresso uppercase tracking-[0.2em] text-xs mb-6">Company</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="text-luxe-espresso/60 hover:text-luxe-burgundy text-sm transition-colors">About Us</Link></li>
              <li><Link href="#" className="text-luxe-espresso/60 hover:text-luxe-burgundy text-sm transition-colors">Careers</Link></li>
              <li><Link href="#" className="text-luxe-espresso/60 hover:text-luxe-burgundy text-sm transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-luxe-espresso uppercase tracking-[0.2em] text-xs mb-6">Legal</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="text-luxe-espresso/60 hover:text-luxe-burgundy text-sm transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="text-luxe-espresso/60 hover:text-luxe-burgundy text-sm transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto pt-8 border-t border-luxe-taupe/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-luxe-espresso/40 text-xs font-bold tracking-widest uppercase">&copy; {new Date().getFullYear()} Saloo. All rights reserved.</p>
          <div className="flex items-center gap-6">
            {['Twitter', 'Instagram', 'LinkedIn'].map(social => (
              <Link key={social} href="#" className="text-luxe-espresso/40 hover:text-luxe-burgundy text-xs font-bold uppercase tracking-widest transition-colors">
                {social}
              </Link>
            ))}
          </div>
        </div>
      </footer>

    </div>
  )
}
