import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

const IST_DATE = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split('T')[0]

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const url = new URL(req.url)
    const shopId = url.searchParams.get('shop_id')
    if (!shopId) return error('shop_id required', 400)

    const supabase = createAdminClient()
    const today = IST_DATE()

    const { data: shop } = await supabase
      .from('shops')
      .select('id, name, photos')
      .eq('id', shopId)
      .single()

    // The user's active entry today
    const { data: entry } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('shop_id', shopId)
      .eq('user_id', user.id)
      .eq('queue_date', today)
      .in('status', ['waiting', 'called', 'in_chair', 'completed'])
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!entry) {
      return json({ data: { in_queue: false, shop: shop ?? null }, error: null })
    }

    // Active chairs (barbers not offline)
    const { data: barbers } = await supabase
      .from('barbers')
      .select('id, name, chair_status, is_active')
      .eq('shop_id', shopId)
      .eq('is_active', true)

    const activeChairs = (barbers ?? []).filter((b: any) => b.chair_status !== 'offline')
    const chairCount = Math.max(activeChairs.length, 1)

    // People ahead: still-waiting/called/in_chair entries that joined before me
    const { data: ahead } = await supabase
      .from('queue_entries')
      .select('estimated_duration_min, status, joined_at')
      .eq('shop_id', shopId)
      .eq('queue_date', today)
      .in('status', ['waiting', 'called', 'in_chair'])
      .lt('joined_at', entry.joined_at)

    const aheadCount = (ahead ?? []).length
    const aheadMinutes = (ahead ?? []).reduce((s: number, x: any) => s + (x.estimated_duration_min ?? 0), 0)
    const estimatedWait = Math.ceil(aheadMinutes / chairCount)

    return json({
      data: {
        in_queue: entry.status !== 'completed',
        shop: shop ?? null,
        entry: {
          id: entry.id,
          token_number: entry.token_number,
          status: entry.status,
          estimated_duration_min: entry.estimated_duration_min,
          joined_at: entry.joined_at,
        },
        ahead_count: aheadCount,
        estimated_wait_min: estimatedWait,
        active_chairs: activeChairs.length,
        chairs: (barbers ?? []).map((b: any) => ({ id: b.id, name: b.name, chair_status: b.chair_status })),
      },
      error: null,
    })
  } catch (err) {
    console.error('queue-status error:', err)
    return error('Failed to get queue status', 500)
  }
})
