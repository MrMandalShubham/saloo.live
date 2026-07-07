import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const admin = createAdminClient()
    const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return error('Forbidden', 403)

    const { id } = await req.json()
    if (!id) return error('id required', 400)

    const { error: delErr } = await admin.from('hairstyles').delete().eq('id', id)
    if (delErr) throw delErr

    return json({ data: { id, deleted: true }, error: null })
  } catch (err) {
    console.error('admin-hairstyle-delete error:', err)
    return error('Failed to delete hairstyle', 500)
  }
})
