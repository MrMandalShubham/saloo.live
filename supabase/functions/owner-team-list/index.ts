import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const supabase = createAdminClient()

    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!shop) return error('Shop not found', 404)

    const { data, error: dbErr } = await supabase
      .from('barbers')
      .select('*, hours:barber_hours(*), portfolio:barber_portfolio(*), barber_services(service_id)')
      .eq('shop_id', shop.id)
      .order('created_at')

    if (dbErr) throw dbErr

    return json({ data, error: null })
  } catch (err) {
    console.error('owner-team-list error:', err)
    return error('Failed to fetch team', 500)
  }
})
