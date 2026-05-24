// Enhanced search: shops, barbers, services
import { handleCors, json, error } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const url = new URL(req.url)
    const q = url.searchParams.get('q')?.trim()
    const city = url.searchParams.get('city')?.trim()
    const searchType = url.searchParams.get('type') ?? 'shop' // shop | barber | service | all
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50)
    const page = parseInt(url.searchParams.get('page') ?? '0')

    const supabase = createAdminClient()

    // Default: search shops
    let query = supabase
      .from('shops')
      .select('id, name, slug, address, city, lat, lng, photos, features, rating, review_count, is_featured')
      .eq('status', 'verified')
      .order('is_featured', { ascending: false })
      .order('rating', { ascending: false })
      .range(page * limit, page * limit + limit - 1)

    if (city) query = query.ilike('city', `%${city}%`)
    if (q) query = query.ilike('name', `%${q}%`)

    const { data: shopResults, error: shopErr } = await query
    if (shopErr) throw shopErr

    // If searching for barbers or services, do additional lookups
    let barberResults: any[] = []
    let serviceResults: any[] = []

    if (q && (searchType === 'barber' || searchType === 'all')) {
      const { data: barbers } = await supabase
        .from('barbers')
        .select(`
          id, name, avatar_url, bio, specialties, rating, review_count,
          experience_level, experience_years, languages,
          portfolio:barber_portfolio(id, image_url, caption, is_before_after),
          shop:shops!inner(id, name, slug, address, city, photos, rating)
        `)
        .eq('is_active', true)
        .eq('shops.status', 'verified')
        .or(`name.ilike.%${q}%,specialties.cs.{${q}}`)
        .limit(limit)

      barberResults = barbers ?? []
    }

    if (q && (searchType === 'service' || searchType === 'all')) {
      const { data: services } = await supabase
        .from('services')
        .select(`
          id, name, category, price, duration_min,
          shop:shops!inner(id, name, slug, address, city, photos, rating)
        `)
        .eq('is_active', true)
        .eq('shops.status', 'verified')
        .ilike('name', `%${q}%`)
        .limit(limit)

      serviceResults = services ?? []
    }

    return json({
      data: {
        shops: shopResults ?? [],
        barbers: barberResults,
        services: serviceResults,
      },
      error: null,
    })
  } catch (err) {
    console.error('shops-search error:', err)
    return error('Search failed', 500)
  }
})
