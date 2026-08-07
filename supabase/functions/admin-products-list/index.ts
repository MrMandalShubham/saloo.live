import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const admin = createAdminClient()
    const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return error('Forbidden', 403)

    const { data } = await admin.from('store_products').select('*').order('sort_order').order('created_at', { ascending: false })
    return json({ data: data ?? [], error: null })
  } catch (err) {
    console.error('admin-products-list error:', err)
    return error('Failed to load products', 500)
  }
})
