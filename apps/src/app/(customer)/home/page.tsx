export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { ShopsGrid } from '@/components/customer/ShopsGrid'
import { QuickReBook } from '@/components/customer/QuickReBook'
import { getAvatarById } from '@/lib/avatars'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  let lastBooking = null

  if (user) {
    const { data: p } = await supabase
      .from('users')
      .select('name, loyalty_tier, loyalty_points, avatar_url')
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

  const greetings = [
    'Looking sharp today,',
    'Ready to level up,',
    'Time for a fresh look,',
    'Your barber awaits,',
    'Stay sharp,',
    'Let\'s get you styled,',
    'Confidence starts here,',
    'Fresh cuts loading for',
    'The chair is waiting,',
    'Your style, your rules,',
    'Clean cuts, bold moves,',
    'Make heads turn,',
    'Upgrade your look,',
    'Style never sleeps,',
    'Own the look,',
    'First class grooming for',
    'Sharp looks ahead,',
    'Glow up time,',
    'Your next look starts here,',
    'Precision cuts for',
    'Stay groomed, stay great,',
    'It\'s your time to shine,',
    'A great cut changes everything,',
    'Walk in good, walk out great,',
    'The best version of you awaits,',
    'Because you deserve the best,',
    'Crisp. Clean. Confident.',
    'Looking for perfection?',
    'Every cut tells a story,',
    'Hey there, handsome —',
  ]
  const greeting = greetings[Math.floor(Math.random() * greetings.length)]

  return (
    <div className="space-y-6 pb-4">

      {/* Greeting Banner */}
      <div className="bg-gradient-to-br from-[#F2FCFA] via-[#E6F8F5] to-[#CCF1EB] border border-saloo-teal/30 rounded-3xl p-5 sm:p-8 relative overflow-hidden shadow-glass-lg group hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-500">
        {/* Decorative orbs */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 rounded-full bg-white/60 blur-[40px] pointer-events-none group-hover:bg-white/80 transition-colors duration-700" />
        <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 rounded-full bg-saloo-teal/15 blur-[40px] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4">
          {/* Avatar */}
          <Link href="/profile" className="shrink-0">
            {(() => {
              const avatarData = getAvatarById(profile?.avatar_url)
              return (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-saloo-teal/30 flex items-center justify-center overflow-hidden hover:border-saloo-teal/60 transition-colors"
                     style={{ backgroundColor: avatarData?.bg ?? 'rgba(255,255,255,0.8)' }}>
                  {avatarData ? (
                    <span className="text-3xl sm:text-4xl">{avatarData.emoji}</span>
                  ) : profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-syne font-bold text-saloo-teal text-xl sm:text-2xl">{firstName?.[0]?.toUpperCase() ?? 'U'}</span>
                  )}
                </div>
              )
            })()}
          </Link>

          {/* Name & greeting */}
          <div className="flex-1 min-w-0">
            <p className="text-saloo-dark/50 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-0.5">{greeting}</p>
            <h1 className="font-syne text-2xl sm:text-3xl font-bold text-saloo-dark tracking-tight truncate">{firstName}</h1>
            <p className="text-saloo-dark/40 text-[10px] sm:text-xs mt-1 font-light">Ready for your next great cut?</p>
          </div>

          {/* Points — compact */}
          {profile && (
            <div className="shrink-0 text-center">
              <div className="bg-saloo-dark/5 border border-saloo-dark/10 rounded-xl px-3 py-2">
                <span className="font-syne font-bold text-saloo-teal text-lg leading-none">{profile.loyalty_points ?? 0}</span>
                <p className="text-saloo-teal/80 text-[8px] uppercase tracking-widest font-bold mt-0.5">pts</p>
              </div>
              <p className="text-saloo-dark/40 text-[8px] uppercase tracking-wider mt-1 font-semibold">{profile.loyalty_tier}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Re-Book */}
      {lastBooking && <QuickReBook booking={lastBooking as any} />}

      {/* Search CTA */}
      <Link
        href="/search"
        className="flex items-center gap-4 bg-white border border-border/80 rounded-2xl px-5 py-4 hover:border-saloo-teal/40 hover:shadow-royal-lg shadow-sm transition-all group"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lavender to-champagne flex items-center justify-center shrink-0 border border-saloo-teal/10 group-hover:scale-110 transition-transform duration-300 shadow-inner">
          <svg className="w-5 h-5 text-saloo-teal" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <div>
          <p className="font-syne font-bold text-navy text-base">Find a Barbershop</p>
          <p className="text-muted text-xs mt-0.5">Search by name, location, or service</p>
        </div>
        <div className="ml-auto w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border group-hover:bg-navy group-hover:border-navy transition-all">
          <svg className="w-4 h-4 text-muted group-hover:text-saloo-teal transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
