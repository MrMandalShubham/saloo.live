import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  if (req.method !== 'POST') return error('Method not allowed', 405)

  try {
    const { phone, name, specialties, bio } = await req.json()
    if (!phone || !name) return error('phone and name are required', 400)

    const supabase = createAdminClient()

    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!shop) return error('Shop not found', 404)

    // Check barber limit (max 10 per shop)
    const { count } = await supabase
      .from('barbers')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shop.id)
      .eq('is_active', true)

    if ((count ?? 0) >= 10) return error('Maximum 10 barbers per shop', 422)

    const { data, error: insertErr } = await supabase
      .from('barbers')
      .insert({
        shop_id: shop.id,
        name,
        phone,
        specialties: specialties ?? [],
        bio: bio ?? null,
        invite_status: 'pending',
        is_active: true,
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    return json({ data, error: null })
  } catch (err) {
    console.error('owner-team-invite error:', err)
    return error('Failed to invite barber', 500)
  }
})
