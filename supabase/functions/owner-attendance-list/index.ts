import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

const IST_DATE = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split('T')[0]

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const supabase = createAdminClient()
    const today = IST_DATE()
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0]

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return error('Shop not found', 404)

    const { data: barbers } = await supabase
      .from('barbers')
      .select('id, name, avatar_url')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .order('name')

    // Last 7 days of attendance for this shop
    const { data: records } = await supabase
      .from('attendance')
      .select('*')
      .eq('shop_id', shop.id)
      .gte('work_date', weekAgo)
      .order('clock_in', { ascending: false })

    const all = records ?? []
    const minutesBetween = (a: string, b: string) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000))

    const rows = (barbers ?? []).map((b: any) => {
      const mine = all.filter((r: any) => r.barber_id === b.id)
      const open = mine.find((r: any) => !r.clock_out)
      const todays = mine.filter((r: any) => r.work_date === today)
      const todayMinutes = todays.reduce((s: number, r: any) => s + (r.clock_out ? minutesBetween(r.clock_in, r.clock_out) : minutesBetween(r.clock_in, new Date().toISOString())), 0)
      const weekMinutes = mine.reduce((s: number, r: any) => s + (r.clock_out ? minutesBetween(r.clock_in, r.clock_out) : minutesBetween(r.clock_in, new Date().toISOString())), 0)
      return {
        barber_id: b.id,
        name: b.name,
        avatar_url: b.avatar_url,
        clocked_in: !!open,
        clock_in_at: open?.clock_in ?? null,
        today_minutes: todayMinutes,
        week_minutes: weekMinutes,
      }
    })

    return json({ data: { date: today, barbers: rows }, error: null })
  } catch (err) {
    console.error('owner-attendance-list error:', err)
    return error('Failed to load attendance', 500)
  }
})
