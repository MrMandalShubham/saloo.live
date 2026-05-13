import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'PATCH') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { notification_id, mark_all = false } = await req.json()
    const supabase = createAdminClient()

    if (mark_all) {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
    } else if (notification_id) {
      await supabase.from('notifications').update({ is_read: true })
        .eq('id', notification_id).eq('user_id', user.id)
    } else {
      return error('notification_id or mark_all required', 400)
    }

    return json({ data: { success: true }, error: null })
  } catch (err) {
    console.error('notifications-read error:', err)
    return error('Failed to mark notification', 500)
  }
})
