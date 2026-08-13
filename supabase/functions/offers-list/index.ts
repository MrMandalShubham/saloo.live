import { handleCors, json, error } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

// Active, currently-valid promotions across verified shops in the customer's section.
// Powers the home hero. Promotions are auto-applied at booking (no private codes),
// so an active + in-window promo is effectively a public offer.
Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const url = new URL(req.url)
    const seg = url.searchParams.get('segment')
    const segList = seg === 'men' || seg === 'women' ? [seg, 'unisex'] : null
    const supabase = createAdminClient()
    const now = new Date().toISOString()

    let q = supabase
      .from('promotions')
      .select('id, title, type, discount_value, shop_id, shop:shops!inner(id, name, photos, segment, status)')
      .eq('is_active', true)
      .eq('shop.status', 'verified')
      .lte('valid_from', now)
      .or(`valid_to.is.null,valid_to.gte.${now}`)
      .order('created_at', { ascending: false })
      .limit(10)
    if (segList) q = q.in('shop.segment', segList)

    const { data, error: e } = await q
    if (e) throw e

    const offers = (data ?? []).map((p: any) => {
      const shop = Array.isArray(p.shop) ? p.shop[0] : p.shop
      const v = Number(p.discount_value)
      const label = p.type === 'percentage_discount' ? `${v}% OFF`
        : p.type === 'flat_discount' ? `₹${v} OFF`
        : p.type === 'happy_hour' ? 'Happy hour'
        : p.type === 'new_customer' ? 'New customer offer'
        : p.title
      return {
        id: p.id,
        title: p.title,
        label,
        shop_id: p.shop_id,
        shop_name: shop?.name ?? '',
        shop_photo: shop?.photos?.[0] ?? null,
      }
    })

    return json({ data: offers, error: null }, 200, 60)
  } catch (err) {
    console.error('offers-list error:', err)
    return error('Failed to load offers', 500)
  }
})
