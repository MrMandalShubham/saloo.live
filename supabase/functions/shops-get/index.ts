import { handleCors, json, error } from '../_shared/cors.ts'
import { createAdminClient, getAuthUser } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const url = new URL(req.url)
    const shopId = url.pathname.split('/').pop()
    if (!shopId) return error('shop_id is required', 400)

    const lat = url.searchParams.get('lat') ? parseFloat(url.searchParams.get('lat')!) : null
    const lng = url.searchParams.get('lng') ? parseFloat(url.searchParams.get('lng')!) : null
    const reviewPage = parseInt(url.searchParams.get('review_page') ?? '0')

    const supabase = createAdminClient()

    // Fetch shop
    const { data: shop, error: shopErr } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .eq('status', 'verified')
      .single()

    if (shopErr || !shop) return error('Shop not found', 404)

    // Fetch related data in parallel
    const [hoursRes, breaksRes, barbersRes, servicesRes, promotionsRes, reviewsRes] =
      await Promise.all([
        supabase.from('shop_hours').select('*').eq('shop_id', shopId).order('day_of_week'),
        supabase.from('shop_breaks').select('*').eq('shop_id', shopId),
        supabase.from('barbers').select('*, barber_hours(*)').eq('shop_id', shopId).eq('is_active', true),
        supabase.from('services').select('*').eq('shop_id', shopId).eq('is_active', true).order('sort_order'),
        supabase.from('promotions').select('*').eq('shop_id', shopId).eq('is_active', true),
        supabase.from('reviews')
          .select('*, user:users(name, avatar_url)')
          .eq('shop_id', shopId)
          .eq('is_visible', true)
          .order('created_at', { ascending: false })
          .range(reviewPage * 10, reviewPage * 10 + 9),
      ])

    // Calculate distance if coordinates provided
    let distance_km = null
    if (lat !== null && lng !== null) {
      const dlat = (shop.lat - lat) * Math.PI / 180
      const dlng = (shop.lng - lng) * Math.PI / 180
      const a = Math.sin(dlat/2)**2 + Math.cos(lat*Math.PI/180) * Math.cos(shop.lat*Math.PI/180) * Math.sin(dlng/2)**2
      distance_km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      distance_km = Math.round(distance_km * 10) / 10
    }

    // Check if user has favourited this shop
    let is_favourite = false
    const { user } = await getAuthUser(req)
    if (user) {
      const { data: fav } = await supabase
        .from('favourites')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('shop_id', shopId)
        .maybeSingle()
      is_favourite = !!fav
    }

    // Cache shop profiles for 15s — reduces DB load for popular shops
    // viewed by many users simultaneously
    return json({
      data: {
        ...shop,
        hours: hoursRes.data ?? [],
        breaks: breaksRes.data ?? [],
        barbers: barbersRes.data ?? [],
        services: servicesRes.data ?? [],
        promotions: promotionsRes.data ?? [],
        latest_reviews: reviewsRes.data ?? [],
        is_favourite,
        distance_km,
      },
      error: null,
    }, 200, 15)
  } catch (err) {
    console.error('shops-get error:', err)
    return error('Failed to fetch shop', 500)
  }
})
