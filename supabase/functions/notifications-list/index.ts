import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const url = new URL(req.url)
    const filter = url.searchParams.get('filter') ?? 'all'  // all|transactional|promotions|loyalty
    const page = parseInt(url.searchParams.get('page') ?? '0')
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '30'), 50)

    const supabase = createAdminClient()

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(page * limit, page * limit + limit - 1)

    if (filter === 'transactional') {
      query = query.in('type', ['booking_confirmed', 'booking_cancelled', 'booking_reminder', 'booking_completed', 'no_show', 'dispute_update'])
    } else if (filter === 'promotions') {
      query = query.in('type', ['promotion', 'review_request'])
    } else if (filter === 'loyalty') {
      query = query.in('type', ['loyalty_earned', 'loyalty_redeemed'])
    }

    const { data, error: dbErr } = await query
    if (dbErr) throw dbErr

    // Unread count
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    return json({ data, unread_count: count ?? 0, error: null })
  } catch (err) {
    console.error('notifications-list error:', err)
    return error('Failed to fetch notifications', 500)
  }
})
