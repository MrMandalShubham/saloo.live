import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  if (req.method !== 'POST') return error('Method not allowed', 405)

  try {
    const { review_id, response } = await req.json()
    if (!review_id || !response?.trim()) return error('review_id and response required', 400)

    const supabase = createAdminClient()

    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!shop) return error('Shop not found', 404)

    const { data, error: dbErr } = await supabase
      .from('reviews')
      .update({
        shop_response: response.trim(),
        responded_at: new Date().toISOString(),
      })
      .eq('id', review_id)
      .eq('shop_id', shop.id)
      .select()
      .single()

    if (dbErr) throw dbErr

    return json({ data, error: null })
  } catch (err) {
    console.error('owner-reviews-respond error:', err)
    return error('Failed to save response', 500)
  }
})
