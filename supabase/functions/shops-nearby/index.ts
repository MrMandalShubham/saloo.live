import { handleCors, json, error } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const url = new URL(req.url)
    const lat = parseFloat(url.searchParams.get('lat') ?? '')
    const lng = parseFloat(url.searchParams.get('lng') ?? '')

    if (isNaN(lat) || isNaN(lng)) return error('lat and lng are required', 400)

    const radius_km = parseFloat(url.searchParams.get('radius_km') ?? '5')
    const open_now = url.searchParams.get('open_now') === 'true'
    const min_rating = parseFloat(url.searchParams.get('min_rating') ?? '0')
    const max_price = url.searchParams.get('max_price') ? parseFloat(url.searchParams.get('max_price')!) : null
    const features = url.searchParams.get('features')?.split(',').filter(Boolean) ?? null
    const sort_by = url.searchParams.get('sort_by') ?? 'nearest'
    const page = parseInt(url.searchParams.get('page') ?? '0')
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50)

    const supabase = createAdminClient()

    const { data, error: dbError } = await supabase.rpc('shops_nearby', {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radius_km,
      p_open_now: open_now,
      p_min_rating: min_rating,
      p_max_price: max_price,
      p_features: features,
      p_sort_by: sort_by,
      p_limit: limit,
      p_offset: page * limit,
    })

    if (dbError) throw dbError

    return json({ data, error: null })
  } catch (err) {
    console.error('shops-nearby error:', err)
    return error('Failed to fetch nearby shops', 500)
  }
})
