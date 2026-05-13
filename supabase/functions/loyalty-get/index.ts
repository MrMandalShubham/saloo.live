import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

const TIER_THRESHOLDS = { silver: 500, gold: 2000, platinum: 5000 }

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const supabase = createAdminClient()

    const [userRes, txRes, visitsRes] = await Promise.all([
      supabase.from('users').select('loyalty_points, loyalty_tier').eq('id', user.id).single(),
      supabase.from('loyalty_transactions').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('bookings').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('status', 'completed'),
    ])

    const points = userRes.data?.loyalty_points ?? 0
    const tier = userRes.data?.loyalty_tier ?? 'bronze'

    const nextTier = tier === 'bronze' ? 'silver' : tier === 'silver' ? 'gold' : tier === 'gold' ? 'platinum' : null
    const pointsToNextTier = nextTier ? Math.max(0, TIER_THRESHOLDS[nextTier] - points) : 0

    return json({
      data: {
        points,
        tier,
        points_to_next_tier: pointsToNextTier,
        next_tier: nextTier,
        transactions: txRes.data ?? [],
        total_visits: visitsRes.count ?? 0,
      },
      error: null,
    })
  } catch (err) {
    console.error('loyalty-get error:', err)
    return error('Failed to fetch loyalty data', 500)
  }
})
