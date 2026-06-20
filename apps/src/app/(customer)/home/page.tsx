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
  let favBarbers: any[] = []

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
        .select('id, booking_ref, status, date, start_time, shop_id, barber_id, service_ids, addon_ids, shop:shops(name)')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      lastBooking = data
    } catch {}

    try {
      const { data: fb } = await (supabase as any)
        .from('favourite_barbers')
        .select('barber:barbers(id, name, avatar_url, shop_id, rating, shop:shops(name))')
        .eq('user_id', user.id)
        .limit(10)
      favBarbers = (fb ?? []).map((r: any) => r.barber).filter(Boolean)
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
      <div className="bg-gradient-to-br from-[#0A1116] to-[#0E1B24] border border-white/10 rounded-3xl p-5 sm:p-8 relative overflow-hidden shadow-2xl group hover:shadow-saloo-teal/20 hover:-translate-y-0.5 transition-all duration-500">
        {/* Decorative orbs */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 rounded-full bg-saloo-teal/10 blur-[60px] pointer-events-none group-hover:bg-saloo-teal/20 transition-colors duration-700" />
        <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 rounded-full bg-blue-500/10 blur-[40px] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4">
          {/* Avatar */}
          <Link href="/profile" className="shrink-0">
            {(() => {
              const avatarData = getAvatarById(profile?.avatar_url)
              return (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-white/30 flex items-center justify-center overflow-hidden hover:border-white/60 transition-colors"
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
            <p className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-0.5">{greeting}</p>
            <h1 className="font-syne text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">{firstName}</h1>
            <p className="text-white/70 text-[10px] sm:text-xs mt-1 font-light">Ready for your next great cut?</p>
          </div>

          {/* Points — compact */}
          {profile && (
            <div className="shrink-0 text-center">
              <div className="bg-white/10 border border-white/20 rounded-xl px-3 py-2">
                <span className="font-syne font-bold text-white text-lg leading-none">{profile.loyalty_points ?? 0}</span>
                <p className="text-white/80 text-[8px] uppercase tracking-widest font-bold mt-0.5">pts</p>
              </div>
              <p className="text-white/70 text-[8px] uppercase tracking-wider mt-1 font-semibold">{profile.loyalty_tier}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Re-Book */}
      {lastBooking && <QuickReBook booking={lastBooking as any} />}

      {/* Your Barbers */}
      {favBarbers.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-6 rounded-full bg-red-400" />
            <h2 className="font-syne font-bold text-xl text-navy">Your Barbers</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {favBarbers.map((b: any) => {
              const shopName = Array.isArray(b.shop) ? b.shop[0]?.name : b.shop?.name
              return (
                <Link
                  key={b.id}
                  href={`/book/${b.shop_id}?barber=${b.id}`}
                  className="shrink-0 w-32 bg-white border border-border rounded-2xl p-3 hover:border-saloo-teal/40 hover:shadow-royal transition-all text-center"
                >
                  <div className="w-14 h-14 rounded-2xl mx-auto bg-gradient-to-br from-gold/20 to-champagne flex items-center justify-center overflow-hidden border border-saloo-teal/20 mb-2">
                    {b.avatar_url ? (
                      <img src={b.avatar_url} alt={b.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">✂️</span>
                    )}
                  </div>
                  <p className="font-semibold text-navy text-sm truncate">{b.name}</p>
                  <p className="text-muted text-[11px] truncate">{shopName}</p>
                  {b.rating > 0 && <p className="text-saloo-teal text-[11px] font-semibold mt-0.5">★ {Number(b.rating).toFixed(1)}</p>}
                </Link>
              )
            })}
          </div>
        </section>
      )}

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

      {/* Discover / Leaderboard */}
      <Link href="/leaderboard"
        className="flex items-center gap-4 bg-gradient-to-br from-[#0A1116] to-[#0E1B24] rounded-2xl px-5 py-4 hover:-translate-y-0.5 transition-transform group relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-5%] w-32 h-32 rounded-full bg-gold/15 blur-2xl" />
        <div className="relative z-10 flex items-center gap-4 w-full">
          <div className="text-2xl">🏆</div>
          <div className="flex-1">
            <p className="font-syne font-bold text-white">Discover Top Barbers</p>
            <p className="text-white/60 text-xs mt-0.5">Trending shops & city leaderboard</p>
          </div>
          <span className="text-gold text-xl group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </Link>

      {/* Nearby Shops */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-6 rounded-full bg-saloo-teal" />
          <h2 className="font-syne font-bold text-xl text-navy">Nearby Shops</h2>
        </div>
        <p className="text-secondary text-sm font-medium ml-3 mb-4 tracking-wide">Top-rated barbers around you</p>
        <ShopsGrid />
      </section>

    </div>
  )
}
