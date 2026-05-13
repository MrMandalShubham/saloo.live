import { createClient } from '@/lib/supabase/server'
import { ShopsGrid } from '@/components/customer/ShopsGrid'
import { QuickReBook } from '@/components/customer/QuickReBook'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  let lastBooking = null

  if (user) {
    const { data: p } = await supabase
      .from('users')
      .select('name, loyalty_tier, loyalty_points')
      .eq('id', user.id)
      .single()
    profile = p

    try {
      const { data } = await supabase
        .from('bookings')
        .select('id, booking_ref, status, date, start_time, shop:shops(name)')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      lastBooking = data
    } catch {}
  }

  const firstName = profile?.name?.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6 pb-4">

      {/* Greeting Banner */}
      <div className="bg-royal-gradient rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-royal-lg group hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-500">
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-gold/10 blur-[40px] pointer-events-none group-hover:bg-gold/20 transition-colors duration-700" />
        <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 rounded-full bg-blue-500/20 blur-[40px] pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-gold/5 blur-[30px] pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs sm:text-sm font-bold uppercase tracking-widest mb-1">{greeting}</p>
            <h1 className="font-syne text-3xl sm:text-4xl font-bold text-white tracking-tight">{firstName}</h1>
            <p className="text-white/45 text-xs sm:text-sm mt-1.5 font-light">Ready for your next great cut?</p>
          </div>
          {profile && (
            <div className="text-right shrink-0">
              <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 text-center shadow-glass">
                <div className="font-syne font-bold text-gold text-2xl leading-none tracking-tight drop-shadow-[0_0_8px_rgba(201,168,76,0.5)]">
                  {profile.loyalty_points?.toLocaleString('en-IN') ?? 0}
                </div>
                <div className="text-gold/70 text-[10px] mt-1 uppercase tracking-widest font-bold">points</div>
              </div>
              <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-2 bg-white/5 inline-block px-2 py-0.5 rounded-full">{profile.loyalty_tier} member</div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Re-Book */}
      {lastBooking && <QuickReBook booking={lastBooking as any} />}

      {/* Search CTA */}
      <Link
        href="/search"
        className="flex items-center gap-4 bg-white border border-border/80 rounded-2xl px-5 py-4 hover:border-gold/40 hover:shadow-royal-lg shadow-sm transition-all group"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lavender to-champagne flex items-center justify-center shrink-0 border border-gold/10 group-hover:scale-110 transition-transform duration-300 shadow-inner">
          <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <div>
          <p className="font-syne font-bold text-navy text-base">Find a Barbershop</p>
          <p className="text-muted text-xs mt-0.5">Search by name, location, or service</p>
        </div>
        <div className="ml-auto w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border group-hover:bg-navy group-hover:border-navy transition-all">
          <svg className="w-4 h-4 text-muted group-hover:text-gold transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </Link>

      {/* Nearby Shops */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-syne font-bold text-2xl tracking-tight text-navy">Nearby Shops</h2>
            <p className="text-secondary text-sm font-medium mt-1 tracking-wide">Top-rated barbers around you</p>
          </div>
          <Link
            href="/search"
            className="px-4 py-2 rounded-full bg-navy/5 text-navy text-xs font-bold uppercase tracking-widest hover:bg-navy hover:text-white transition-colors flex items-center gap-2 group"
          >
            See all <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </Link>
        </div>
        <ShopsGrid />
      </section>

    </div>
  )
}
