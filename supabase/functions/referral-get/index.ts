import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

const REFERRER_REWARD = 200
const REFEREE_REWARD = 100

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const supabase = createAdminClient()

    const { data: me } = await supabase
      .from('users')
      .select('referral_code, referred_by, referral_rewarded')
      .eq('id', user.id)
      .single()

    if (!me) return error('User not found', 404)

    // Friends who used my code
    const { count: referredCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by', user.id)

    // How many of those have already earned me the reward
    const { count: rewardedCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by', user.id)
      .eq('referral_rewarded', true)

    // Can I still apply someone's code? Only if I haven't been referred and have no completed bookings
    const { count: completedCount } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed')

    const canApply = !me.referred_by && (completedCount ?? 0) === 0

    return json({
      data: {
        code: me.referral_code,
        referred_count: referredCount ?? 0,
        points_earned: (rewardedCount ?? 0) * REFERRER_REWARD,
        can_apply: canApply,
        already_referred: !!me.referred_by,
        referrer_reward: REFERRER_REWARD,
        referee_reward: REFEREE_REWARD,
      },
      error: null,
    })
  } catch (err) {
    console.error('referral-get error:', err)
    return error('Failed to load referral info', 500)
  }
})
