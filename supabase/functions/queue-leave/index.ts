import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { entry_id } = await req.json()
    if (!entry_id) return error('entry_id required', 400)

    const supabase = createAdminClient()

    const { data: entry } = await supabase
      .from('queue_entries')
      .select('id, user_id, status')
      .eq('id', entry_id)
      .single()

    if (!entry) return error('Queue entry not found', 404)
    if (entry.user_id !== user.id) return error('Not your queue entry', 403)
    if (!['waiting', 'called'].includes(entry.status)) {
      return error('Cannot leave queue at this stage', 422)
    }

    const { error: updErr } = await supabase
      .from('queue_entries')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', entry_id)

    if (updErr) throw updErr

    return json({ data: { id: entry_id, status: 'cancelled' }, error: null })
  } catch (err) {
    console.error('queue-leave error:', err)
    return error('Failed to leave queue', 500)
  }
})
