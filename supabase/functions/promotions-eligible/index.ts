import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'
import { eligiblePromos } from '../_shared/promotions.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { shop_id, service_ids, total, start_time } = await req.json()
    if (!shop_id || !Array.isArray(service_ids) || total == null) return error('shop_id, service_ids, total required', 400)

    const supabase = createAdminClient()
    const eligible = await eligiblePromos(supabase, {
      shopId: shop_id, serviceIds: service_ids, total: Number(total), userId: user.id, startTime: start_time,
    })

    return json({ data: { promos: eligible, best: eligible[0] ?? null }, error: null })
  } catch (err) {
    console.error('promotions-eligible error:', err)
    return error('Failed to load offers', 500)
  }
})
