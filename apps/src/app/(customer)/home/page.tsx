export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ShopsGrid } from '@/components/customer/ShopsGrid'
import { QuickReBook } from '@/components/customer/QuickReBook'
import { GuestSectionSwitch } from '@/components/customer/GuestSectionSwitch'
import { HeroCarousel } from '@/components/customer/HeroCarousel'
import { TrendingHaircuts } from '@/components/customer/TrendingHaircuts'
import { TopRatedStrip } from '@/components/customer/TopRatedStrip'
import { getAvatarById } from '@/lib/avatars'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cookieStore = await cookies()

  let profile: any = null
  let lastBooking: any = null

  if (user) {
    const { data: p } = await (supabase as any)
      .from('users')
      .select('name, loyalty_tier, loyalty_points, avatar_url, segment')
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
  }

  const firstName = profile?.name?.split(' ')[0] ?? 'there'
  const guestSegment = cookieStore.get('guest_segment')?.value
  const isWomen = user ? profile?.segment === 'women' : guestSegment === 'women'
  const segment = isWomen ? 'women' : 'men'
  const avatarData = getAvatarById(profile?.avatar_url)

  return (
    <div className="space-y-6 pb-4">

      {/* Slim greeting */}
      <div className="flex items-center gap-3 pt-1">
        <Link href="/profile" className="shrink-0">
          <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center overflow-hidden"
               style={{ backgroundColor: avatarData?.bg ?? '#f3f0e8' }}>
            {avatarData ? (
              <span className="text-2xl">{avatarData.emoji}</span>
            ) : profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="font-syne font-bold text-saloo-teal text-lg">{firstName?.[0]?.toUpperCase() ?? 'U'}</span>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-syne font-bold text-navy text-lg leading-tight truncate">Hi {firstName}</p>
          <div className="mt-0.5">
            {user
              ? <span className="text-[9px] font-bold uppercase tracking-widest bg-navy/5 text-navy border border-border px-2 py-0.5 rounded-full">{isWomen ? '💅 Women' : '💈 Men'}</span>
              : <GuestSectionSwitch isWomen={isWomen} />}
          </div>
        </div>
        {profile && (
          <Link href="/profile" className="shrink-0 flex items-center gap-1.5 bg-gold/10 border border-gold/30 rounded-full px-3 py-1.5">
            <span className="text-gold text-sm leading-none">★</span>
            <span className="font-syne font-bold text-navy text-sm leading-none">{profile.loyalty_points ?? 0}</span>
            <span className="text-muted text-[9px] uppercase tracking-wider font-semibold">{profile.loyalty_tier}</span>
          </Link>
        )}
      </div>

      {/* Hero — auto-advancing offers & featured shops */}
      <HeroCarousel segment={segment} />

      {/* Trending haircuts — auto-scrolling */}
      <TrendingHaircuts segment={segment} isWomen={isWomen} />

      {/* Top-rated near you */}
      <TopRatedStrip segment={segment} />

      {/* Book again (returning customers only) */}
      {lastBooking && <QuickReBook booking={lastBooking as any} />}

      {/* Nearby Shops */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-6 rounded-full bg-saloo-teal" />
          <h2 className="font-syne font-bold text-xl text-navy">Nearby Shops</h2>
        </div>
        <p className="text-secondary text-sm font-medium ml-3 mb-4 tracking-wide">{isWomen ? 'Top-rated salons around you' : 'Top-rated barbers around you'}</p>
        <ShopsGrid />
      </section>

    </div>
  )
}
