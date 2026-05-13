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
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    title: 'Discover Nearby',
    desc: 'Find verified barbershops near you with live availability, real ratings, and photos.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Instant Booking',
    desc: 'Pick your barber, choose a slot, pay just 30% advance — done in under 60 seconds.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Walk Straight In',
    desc: 'Arrive on time, skip the queue entirely, and go straight to the chair.',
  },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Find a Shop', desc: 'Browse verified barbers near you with real-time availability and honest reviews.' },
  { step: '02', title: 'Choose Your Slot', desc: 'Pick your barber and time. Pay just 30% advance to lock in your appointment.' },
  { step: '03', title: 'Walk In Stress-Free', desc: 'Arrive on time and go straight to the chair — no waiting, ever.' },
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
      <div className="bg-saloo-white border border-saloo-taupe/30 p-6 shadow-luxe-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-saloo-dark flex items-center justify-center shrink-0">
            <span className="font-playfair font-black text-saloo-rose text-xl italic">S</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-playfair font-black text-saloo-dark text-lg tracking-wide leading-tight">Style Studio</p>
            <p className="text-saloo-espresso text-xs uppercase tracking-widest font-medium">Bandra West</p>
          </div>
          <span className="bg-saloo-rose/10 border border-saloo-rose/30 text-saloo-rose text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">Available</span>
        </div>

        <div className="bg-saloo-ivory border border-saloo-stone p-4 mb-6">
          <p className="text-[10px] text-saloo-espresso uppercase tracking-[0.2em] font-medium mb-1">Selected Service</p>
          <p className="font-playfair font-bold text-saloo-dark text-base">Signature Cut & Beard Sculpt</p>
          <p className="text-saloo-burg text-xs font-semibold mt-1">₹1,299 · 60 min</p>
        </div>

        <p className="text-[10px] text-saloo-espresso mb-3 font-medium uppercase tracking-[0.2em]">Available Slots</p>
        <div className="grid grid-cols-4 gap-2 mb-6">
          {SLOTS.map((slot, i) => (
            <button
              key={slot}
              onClick={() => setActive(i)}
              className={`py-2.5 text-xs font-semibold transition-all duration-500 border ${
                active === i ? 'bg-saloo-dark text-saloo-rose border-saloo-dark' : 'bg-transparent text-saloo-espresso border-saloo-stone hover:border-saloo-taupe hover:text-saloo-dark'
              }`}
            >
              {slot}
            </button>
          ))}
        </div>

        <button className="w-full bg-saloo-rose text-saloo-dark font-playfair font-black py-4 text-sm uppercase tracking-widest shadow-gold hover:brightness-105 transition-all active:scale-[0.98]">
          Reserve Now
        </button>
      </div>

      <div className="absolute -top-4 -right-4 bg-saloo-burg text-saloo-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 shadow-luxe-lg flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-saloo-white animate-pulse" />
        Reserved
      </div>

      <div className="absolute -bottom-6 -left-6 bg-saloo-white border border-saloo-stone shadow-luxe-lg p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-saloo-rose/10 border border-saloo-rose/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-saloo-rose" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
          </svg>
        </div>
        <div>
          <p className="font-playfair font-black text-saloo-dark text-base leading-none">4.9 / 5.0</p>
          <p className="text-saloo-espresso text-[10px] uppercase tracking-widest mt-1">Excellence Rated</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Stat Card ──────────────────────────────────────────────────────── */

function StatCard({ value, label, inView, isStatic }: { value: string; label: string; inView: boolean; isStatic?: boolean }) {
  const numMatch = value.match(/^(\d+)(\D.*)$|^(\d+)([+])$/)
  const num = numMatch ? parseInt(numMatch[1] ?? numMatch[3]) : 0
  const suffix = numMatch ? (numMatch[2] ?? numMatch[4] ?? '') : ''
  const count = useCountUp(num, suffix, inView && !isStatic)
  return (
    <div className="text-center p-6 sm:p-8">
      <div className="font-playfair text-4xl sm:text-6xl font-black tabular-nums tracking-tighter text-saloo-dark">
        {isStatic ? value : (inView ? count : `0${suffix}`)}
      </div>
      <div className="text-saloo-espresso text-xs sm:text-sm mt-3 font-medium uppercase tracking-[0.2em]">{label}</div>
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
    <div className="min-h-screen bg-saloo-ivory overflow-x-hidden selection:bg-saloo-rose/20 selection:text-saloo-dark">

      {/* ── Navbar ───────────────────────────────────────────────────── */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-saloo-ivory/95 border-b border-saloo-stone shadow-luxe backdrop-blur-xl' : 'bg-transparent border-b border-transparent'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-saloo-dark flex items-center justify-center group-hover:shadow-gold transition-all">
              <span className="font-playfair font-black text-saloo-rose text-sm">S</span>
            </div>
            <span className="font-playfair text-2xl font-bold text-saloo-dark tracking-widest uppercase">Saloo</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/search" className="hidden sm:block text-saloo-espresso hover:text-saloo-dark text-sm font-medium tracking-widest uppercase px-3 py-1.5 transition-all">Find Shops</Link>
            <Link href="/login" className="hidden sm:block text-saloo-espresso hover:text-saloo-dark text-sm font-medium tracking-widest uppercase px-3 py-1.5 transition-all">Sign In</Link>
            <Link href="/login" className="bg-saloo-dark text-saloo-rose px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:shadow-gold transition-all">
              Book Now
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0 bg-luxe-hero" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-saloo-rose/8 blur-[120px]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-saloo-burg/8 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

            <div className="flex-1 text-center lg:text-left max-w-2xl">
              <div className="inline-flex items-center gap-3 border border-saloo-rose/30 bg-saloo-rose/5 text-saloo-rose text-xs px-5 py-2.5 uppercase tracking-[0.2em] font-medium mb-8 animate-fade-up">
                <span className="w-1.5 h-1.5 rounded-full bg-saloo-rose animate-pulse" />
                India&apos;s Premier Barber Platform
              </div>

              <h1 className="font-playfair text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-black text-saloo-white leading-[1.05] mb-8 text-balance animate-fade-up" style={{ animationDelay: '0.1s' }}>
                Book Your Barber,{' '}
                <br className="hidden md:block" />
                <span className="relative inline-block mt-2">
                  <span className="text-saloo-rose italic">Walk Straight In</span>
                  <div className="absolute -bottom-2 left-0 w-full h-[1px] bg-saloo-rose/40" />
                </span>
              </h1>

              <p className="text-saloo-taupe text-base sm:text-lg max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed font-light animate-fade-up" style={{ animationDelay: '0.2s' }}>
                Find top-rated barbers near you, book in 60 seconds with just 30% advance, and skip the queue — forever.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-up" style={{ animationDelay: '0.3s' }}>
                <Link href="/login" className="bg-saloo-rose text-saloo-dark px-10 py-5 font-playfair font-black text-lg sm:text-xl hover:brightness-110 hover:shadow-gold transition-all flex items-center justify-center gap-2 tracking-wide">
                  Book Online <span className="font-sans font-light">→</span>
                </Link>
                <Link href="/search" className="border border-saloo-taupe/30 text-saloo-white px-10 py-5 font-medium text-base sm:text-lg hover:bg-white/5 transition-all flex items-center justify-center tracking-wide">
                  Explore Shops
                </Link>
              </div>

              <div className="flex items-center gap-6 mt-10 justify-center lg:justify-start animate-fade-up" style={{ animationDelay: '0.4s' }}>
                {['Free to join', 'Instant confirmation', 'No hidden fees'].map(t => (
                  <div key={t} className="flex items-center gap-2 text-saloo-taupe/60 text-xs font-medium uppercase tracking-widest">
                    <svg className="w-3.5 h-3.5 text-saloo-rose" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
      <section className="bg-saloo-ivory border-y border-saloo-stone relative">
        <div ref={statsSection.ref} className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="grid grid-cols-3 gap-2 sm:gap-6">
            <StatCard value="500+" label="Verified Barbershops" inView={statsSection.inView} />
            <StatCard value="50K+" label="Happy Customers" inView={statsSection.inView} />
            <StatCard value="4.9★" label="Avg Rating" inView={statsSection.inView} isStatic />
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 bg-saloo-ivory">
        <div ref={featuresSection.ref} className={`max-w-5xl mx-auto transition-all duration-700 ${featuresSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="text-center mb-20">
            <span className="text-xs font-medium text-saloo-rose tracking-[0.3em] uppercase">The Experience</span>
            <h2 className="font-playfair text-4xl sm:text-5xl md:text-6xl font-bold text-saloo-dark mt-4 text-balance">The Art of Fine Grooming</h2>
            <p className="text-saloo-espresso text-base sm:text-lg mt-6 max-w-2xl mx-auto font-light leading-relaxed">Elevating your routine through curated barbers, seamless booking, and a commitment to your time.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-px bg-saloo-stone">
            {FEATURES.map((f) => (
              <div key={f.title} className="group bg-saloo-ivory p-10 sm:p-12 hover:bg-saloo-white transition-all duration-500">
                <div className="w-14 h-14 border border-saloo-stone flex items-center justify-center mb-8 text-saloo-espresso group-hover:border-saloo-rose group-hover:text-saloo-rose transition-all duration-500">{f.icon}</div>
                <h3 className="font-playfair font-bold text-xl text-saloo-dark mb-4 tracking-wide">{f.title}</h3>
                <p className="text-saloo-espresso text-sm leading-relaxed font-light">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section className="bg-saloo-dark py-24 sm:py-32 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-saloo-rose/5 blur-[150px]" />
        </div>

        <div ref={howSection.ref} className={`max-w-5xl mx-auto transition-all duration-700 relative z-10 ${howSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="text-center mb-20">
            <span className="text-xs font-medium text-saloo-rose tracking-[0.3em] uppercase">The Process</span>
            <h2 className="font-playfair text-4xl sm:text-5xl font-bold text-saloo-white mt-4">Simplicity Refined</h2>
            <p className="text-saloo-taupe/60 text-base mt-4 max-w-lg mx-auto font-light">Three effortless steps to your perfect grooming experience.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            {HOW_IT_WORKS.map((s, i) => (
              <button
                key={s.step}
                onClick={() => setActiveStep(i)}
                className={`text-left p-8 sm:p-10 border transition-all duration-500 ${
                  activeStep === i
                    ? 'bg-white/5 border-saloo-rose/30 shadow-gold'
                    : 'bg-transparent border-white/5 hover:bg-white/[0.02] hover:border-white/10'
                }`}
              >
                <div className={`w-12 h-12 border flex items-center justify-center mb-6 transition-all duration-300 ${
                  activeStep === i ? 'border-saloo-rose/40 bg-saloo-rose/10' : 'border-white/10 bg-transparent'
                }`}>
                  <span className={`font-playfair text-sm font-black transition-colors ${activeStep === i ? 'text-saloo-rose' : 'text-white/20'}`}>{s.step}</span>
                </div>
                <h3 className={`font-playfair font-bold text-xl mb-3 tracking-wide transition-colors ${activeStep === i ? 'text-saloo-white' : 'text-white/30'}`}>{s.title}</h3>
                <p className={`text-sm leading-relaxed font-light transition-colors ${activeStep === i ? 'text-saloo-taupe/70' : 'text-white/15'}`}>{s.desc}</p>
              </button>
            ))}
          </div>

          <div className="flex justify-center gap-3 mt-10">
            {HOW_IT_WORKS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`h-[2px] transition-all duration-500 ${activeStep === i ? 'bg-saloo-rose w-8' : 'bg-white/10 w-4 hover:bg-white/20'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Shop Owners ──────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 bg-saloo-ivory">
        <div className="absolute top-0 left-0 w-full h-px bg-saloo-stone" />

        <div ref={ownerSection.ref} className={`max-w-6xl mx-auto transition-all duration-700 ${ownerSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="bg-saloo-dark p-10 sm:p-16 lg:p-20 relative overflow-hidden flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-saloo-rose/5 blur-[100px]" />
            </div>

            <div className="relative z-10 flex-1">
              <span className="text-xs font-medium text-saloo-rose tracking-[0.3em] uppercase mb-4 block">For Partners</span>
              <h2 className="font-playfair text-4xl sm:text-5xl md:text-6xl font-bold text-saloo-white mb-6 leading-[1.1] text-balance">
                Elevate Your <br className="hidden sm:block" /> Business
              </h2>
              <p className="text-saloo-taupe/70 text-base sm:text-lg leading-relaxed mb-10 max-w-xl font-light">
                Saloo provides the digital infrastructure for world-class grooming establishments. Manage with precision, grow with purpose.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  'Smart calendar & availability management',
                  'Advance payment collection — no no-shows',
                  'Customer ratings & review management',
                  'Analytics dashboard to track growth',
                ].map(text => (
                  <li key={text} className="flex items-center gap-4 text-saloo-white/80 text-sm">
                    <span className="w-1.5 h-1.5 bg-saloo-rose shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="inline-flex items-center justify-center bg-saloo-rose text-saloo-dark px-10 py-5 font-playfair font-black text-sm uppercase tracking-widest hover:brightness-110 hover:shadow-gold transition-all w-full sm:w-auto">
                Partner with Us <span className="font-sans font-light ml-2">→</span>
              </Link>
            </div>

            <div className="relative z-10 flex-shrink-0 grid grid-cols-2 gap-px bg-white/5 w-full max-w-sm">
              {[
                { label: 'Bookings Today', value: '24', trend: '+12%' },
                { label: 'Revenue', value: '₹8.4K', trend: '+18%' },
                { label: 'Avg Rating', value: '4.9★', trend: '' },
                { label: 'New Customers', value: '31', trend: '+9%' },
              ].map(stat => (
                <div key={stat.label} className="bg-saloo-dark p-6 sm:p-8 flex flex-col justify-between">
                  <div>
                    <div className="font-playfair font-black text-saloo-white text-2xl mb-1">{stat.value}</div>
                    <div className="text-saloo-taupe/40 text-xs uppercase tracking-widest font-medium">{stat.label}</div>
                    {stat.trend && <div className="text-saloo-rose text-xs font-semibold mt-2">{stat.trend}</div>}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 px-4 sm:px-6 bg-saloo-white border-t border-saloo-stone">
        <div ref={testimonialsSection.ref} className={`max-w-6xl mx-auto transition-all duration-700 relative z-10 ${testimonialsSection.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="text-center mb-20">
            <span className="text-xs font-medium text-saloo-rose tracking-[0.3em] uppercase">Testimonials</span>
            <h2 className="font-playfair text-4xl sm:text-5xl font-bold text-saloo-dark mt-4">Client Voices</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-saloo-stone">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-saloo-white p-8 sm:p-10 relative group hover:bg-saloo-ivory transition-all duration-300">
                <div className="text-saloo-stone text-6xl font-playfair font-black absolute top-4 right-6 leading-none">&ldquo;</div>
                <div className="flex text-saloo-rose text-sm mb-6">
                  {[...Array(t.rating)].map((_, j) => (
                    <svg key={j} className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
                    </svg>
                  ))}
                </div>
                <p className="text-saloo-dark/70 leading-relaxed font-light mb-8 text-sm sm:text-base relative z-10">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-4 mt-auto">
                  <div className="w-11 h-11 bg-saloo-dark flex items-center justify-center font-playfair font-bold text-sm text-saloo-rose">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-playfair font-bold text-saloo-dark">{t.name}</div>
                    <div className="text-saloo-espresso text-xs font-medium tracking-widest uppercase">{t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-saloo-dark py-28 sm:py-36 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/4 w-96 h-96 rounded-full bg-saloo-rose/5 blur-[150px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="text-xs font-medium text-saloo-rose tracking-[0.3em] uppercase mb-6 block">Get Started</span>
          <h2 className="font-playfair text-5xl sm:text-6xl md:text-7xl font-bold text-saloo-white mb-8">
            Ready for a <br className="hidden sm:block" />
            <span className="text-saloo-rose italic font-light">Better Experience?</span>
          </h2>
          <p className="text-saloo-taupe/50 text-lg sm:text-xl mb-12 max-w-2xl mx-auto font-light">
            Join the platform that respects your time. Book your next haircut in 60 seconds and walk straight to the chair.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="bg-saloo-rose text-saloo-dark px-10 py-5 font-playfair font-black text-lg hover:brightness-110 hover:shadow-gold transition-all tracking-wide">
              Book Your Slot
            </Link>
            <Link href="/search" className="border border-white/10 text-saloo-white px-10 py-5 font-medium text-lg hover:bg-white/5 transition-all tracking-wide">
              Find a Barber
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-saloo-ivory border-t border-saloo-stone pt-20 pb-10 px-4 sm:px-6 relative z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-6 group inline-flex">
              <div className="w-8 h-8 bg-saloo-dark flex items-center justify-center group-hover:shadow-gold transition-all">
                <span className="font-playfair font-black text-saloo-rose text-sm">S</span>
              </div>
              <span className="font-playfair text-2xl font-bold text-saloo-dark tracking-widest uppercase">Saloo</span>
            </Link>
            <p className="text-saloo-espresso text-sm font-light leading-relaxed max-w-xs">
              The premier platform for high-end grooming, respecting both the barber&apos;s craft and the client&apos;s time.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-saloo-dark uppercase tracking-[0.2em] text-xs mb-6">Platform</h4>
            <ul className="space-y-4">
              <li><Link href="/search" className="text-saloo-espresso hover:text-saloo-dark text-sm transition-colors">Find a Shop</Link></li>
              <li><Link href="/login" className="text-saloo-espresso hover:text-saloo-dark text-sm transition-colors">Partner Login</Link></li>
              <li><Link href="#" className="text-saloo-espresso hover:text-saloo-dark text-sm transition-colors">How it Works</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-saloo-dark uppercase tracking-[0.2em] text-xs mb-6">Company</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="text-saloo-espresso hover:text-saloo-dark text-sm transition-colors">About Us</Link></li>
              <li><Link href="#" className="text-saloo-espresso hover:text-saloo-dark text-sm transition-colors">Careers</Link></li>
              <li><Link href="#" className="text-saloo-espresso hover:text-saloo-dark text-sm transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-saloo-dark uppercase tracking-[0.2em] text-xs mb-6">Legal</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="text-saloo-espresso hover:text-saloo-dark text-sm transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="text-saloo-espresso hover:text-saloo-dark text-sm transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto pt-8 border-t border-saloo-stone flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-saloo-espresso/60 text-xs font-medium tracking-widest uppercase">&copy; {new Date().getFullYear()} Saloo. All rights reserved.</p>
          <div className="flex items-center gap-6">
            {['Twitter', 'Instagram', 'LinkedIn'].map(social => (
              <Link key={social} href="#" className="text-saloo-espresso/60 hover:text-saloo-dark text-xs font-medium uppercase tracking-widest transition-colors">
                {social}
              </Link>
            ))}
          </div>
        </div>
      </footer>

    </div>
  )
}
