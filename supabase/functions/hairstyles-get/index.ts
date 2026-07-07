import { handleCors, json, error } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const id = new URL(req.url).pathname.split('/').pop()
    if (!id) return error('hairstyle id required', 400)

    const supabase = createAdminClient()

    const { data: style } = await supabase
      .from('hairstyles')
      .select('*')
      .eq('id', id)
      .single()

    if (!style || !style.is_active) return error('Hairstyle not found', 404)

    // Bump view count (fire and forget)
    supabase.from('hairstyles').update({ view_count: (style.view_count ?? 0) + 1 }).eq('id', id).then(() => {}, () => {})

    // Barbers who do this cut (haircut_tags overlap the style's tags), in verified shops
    let barbers: any[] = []
    if (Array.isArray(style.tags) && style.tags.length > 0) {
      const { data } = await supabase
        .from('barbers')
        .select('id, name, avatar_url, rating, review_count, shop_id, haircut_tags, shop:shops!inner(id, name, city, status)')
        .overlaps('haircut_tags', style.tags)
        .eq('is_active', true)
        .eq('shop.status', 'verified')
        .order('rating', { ascending: false })
        .limit(12)
      barbers = (data ?? []).map((b: any) => {
        const shop = Array.isArray(b.shop) ? b.shop[0] : b.shop
        return {
          id: b.id, name: b.name, avatar_url: b.avatar_url,
          rating: b.rating ?? 0, review_count: b.review_count ?? 0,
          shop_id: b.shop_id, shop_name: shop?.name ?? '', city: shop?.city ?? '',
        }
      })
    }

    return json({ data: { style, barbers }, error: null }, 200, 30)
  } catch (err) {
    console.error('hairstyles-get error:', err)
    return error('Failed to load hairstyle', 500)
  }
})
