import { handleCors, json, error } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const url = new URL(req.url)
    const city = url.searchParams.get('city')?.trim()
    const supabase = createAdminClient()

    let shopQuery = supabase
      .from('shops')
      .select('id, name, photos, rating, review_count, city, is_featured')
      .eq('status', 'verified')
    if (city) shopQuery = shopQuery.ilike('city', `%${city}%`)

    const { data: shops } = await shopQuery
      .order('is_featured', { ascending: false })
      .order('rating', { ascending: false })
      .order('review_count', { ascending: false })
      .limit(10)

    const shopIds = (shops ?? []).map((s: any) => s.id)

    // Starting price per shop (min active service price)
    let priceByShop: Record<string, number> = {}
    if (shopIds.length > 0) {
      const { data: svcs } = await supabase
        .from('services')
        .select('shop_id, price')
        .in('shop_id', shopIds)
        .eq('is_active', true)
        .eq('is_addon', false)
      for (const s of svcs ?? []) {
        const cur = priceByShop[s.shop_id]
        if (cur == null || s.price < cur) priceByShop[s.shop_id] = s.price
      }
    }

    const trending_shops = (shops ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      photo: s.photos?.[0] ?? null,
      rating: s.rating ?? 0,
      review_count: s.review_count ?? 0,
      city: s.city,
      is_featured: s.is_featured,
      starting_price: priceByShop[s.id] ?? null,
    }))

    // Top barbers (in verified shops)
    const { data: barbers } = await supabase
      .from('barbers')
      .select('id, name, avatar_url, rating, review_count, specialties, shop_id, shop:shops!inner(name, city, status)')
      .eq('is_active', true)
      .eq('shop.status', 'verified')
      .order('rating', { ascending: false })
      .order('review_count', { ascending: false })
      .limit(10)

    const top_barbers = (barbers ?? [])
      .filter((b: any) => !city || (Array.isArray(b.shop) ? b.shop[0]?.city : b.shop?.city)?.toLowerCase().includes(city.toLowerCase()))
      .map((b: any) => {
        const shop = Array.isArray(b.shop) ? b.shop[0] : b.shop
        return {
          id: b.id,
          name: b.name,
          avatar_url: b.avatar_url,
          rating: b.rating ?? 0,
          review_count: b.review_count ?? 0,
          specialties: b.specialties ?? [],
          shop_id: b.shop_id,
          shop_name: shop?.name ?? '',
        }
      })

    // Popular specialist tags (from barbers' specialties)
    const tagCount: Record<string, number> = {}
    for (const b of barbers ?? []) {
      for (const t of b.specialties ?? []) tagCount[t] = (tagCount[t] ?? 0) + 1
    }
    const specialist_tags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }))

    return json({ data: { trending_shops, top_barbers, specialist_tags }, error: null }, 200, 60)
  } catch (err) {
    console.error('leaderboard-get error:', err)
    return error('Failed to load leaderboard', 500)
  }
})
