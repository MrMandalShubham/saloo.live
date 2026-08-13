import { createClient } from '@/lib/supabase/client'

const BASE = process.env['NEXT_PUBLIC_SUPABASE_URL']
const ANON = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''

export type Offer = { id: string; title: string; label: string; shop_id: string; shop_name: string; shop_photo: string | null }
export type TrendingShop = { id: string; name: string; photo: string | null; rating: number; review_count: number; city: string; is_featured: boolean; starting_price: number | null }

export type HomeData = { offers: Offer[]; shops: TrendingShop[] }

/** Offers + trending/top-rated shops for the section. Shared by the hero and the top-rated strip. */
export async function fetchHomeData(segment: string): Promise<HomeData> {
  const { data: { session } } = await createClient().auth.getSession()
  const headers = { Authorization: `Bearer ${session?.access_token ?? ''}`, apikey: ANON }
  const [offersRes, lbRes] = await Promise.all([
    fetch(`${BASE}/functions/v1/offers-list?segment=${segment}`, { headers }).catch(() => null),
    fetch(`${BASE}/functions/v1/leaderboard-get?segment=${segment}`, { headers }).catch(() => null),
  ])
  const offers: Offer[] = offersRes ? ((await offersRes.json()).data ?? []) : []
  const shops: TrendingShop[] = lbRes ? ((await lbRes.json()).data?.trending_shops ?? []) : []
  return { offers, shops }
}
