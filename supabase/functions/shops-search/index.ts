import { handleCors, json, error } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const url = new URL(req.url)
    const q = url.searchParams.get('q')?.trim()
    const city = url.searchParams.get('city')?.trim()
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50)
    const page = parseInt(url.searchParams.get('page') ?? '0')

    const supabase = createAdminClient()

    let query = supabase
      .from('shops')
      .select('id, name, slug, address, city, lat, lng, photos, features, rating, review_count, is_featured')
      .eq('status', 'verified')
      .order('is_featured', { ascending: false })
      .order('rating', { ascending: false })
      .range(page * limit, page * limit + limit - 1)

    if (city) query = query.ilike('city', `%${city}%`)
    if (q) query = query.ilike('name', `%${q}%`)

    const { data, error: dbErr } = await query
    if (dbErr) throw dbErr

    return json({ data, error: null })
  } catch (err) {
    console.error('shops-search error:', err)
    return error('Search failed', 500)
  }
})
