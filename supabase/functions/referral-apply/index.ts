import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { code } = await req.json()
    if (!code || !code.trim()) return error('Referral code required', 400)
    const cleanCode = code.trim().toUpperCase()

    const supabase = createAdminClient()

    const { data: me } = await supabase
      .from('users')
      .select('id, referral_code, referred_by')
      .eq('id', user.id)
      .single()

    if (!me) return error('User not found', 404)
    if (me.referred_by) return error('You have already used a referral code', 422)
    if (me.referral_code === cleanCode) return error("You can't use your own code", 422)

    // Must be a fresh customer (no completed bookings yet)
    const { count: completedCount } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed')
    if ((completedCount ?? 0) > 0) {
      return error('Referral codes can only be applied before your first completed booking', 422)
    }

    // Find the referrer
    const { data: referrer } = await supabase
      .from('users')
      .select('id, name')
      .eq('referral_code', cleanCode)
      .single()

    if (!referrer) return error('Invalid referral code', 404)
    if (referrer.id === user.id) return error("You can't use your own code", 422)

    const { error: updErr } = await supabase
      .from('users')
      .update({ referred_by: referrer.id })
      .eq('id', user.id)

    if (updErr) throw updErr

    return json({
      data: { applied: true, referrer_name: referrer.name ?? 'Your friend' },
      error: null,
    })
  } catch (err) {
    console.error('referral-apply error:', err)
    return error('Failed to apply referral code', 500)
  }
})
