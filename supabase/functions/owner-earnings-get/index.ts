import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const url = new URL(req.url)
    const period = (url.searchParams.get('period') ?? '30d') as '7d' | '30d' | '90d'
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!

    const supabase = createAdminClient()

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return error('Shop not found', 404)

    const { data: barbers } = await supabase
      .from('barbers')
      .select('id, name, commission_rate, avatar_url')
      .eq('shop_id', shop.id)
      .eq('is_active', true)

    const { data: bookings } = await supabase
      .from('bookings')
      .select('barber_id, total_amount, tip_amount')
      .eq('shop_id', shop.id)
      .eq('status', 'completed')
      .gte('date', fromDate)

    const completed = bookings ?? []

    const rows = (barbers ?? []).map((b: any) => {
      const mine = completed.filter((x: any) => x.barber_id === b.id)
      const revenue = mine.reduce((s: number, x: any) => s + (Number(x.total_amount) || 0), 0)
      const tips = mine.reduce((s: number, x: any) => s + (Number(x.tip_amount) || 0), 0)
      const rate = b.commission_rate ?? 40
      const commission = Math.round((revenue * rate) / 100)
      return {
        barber_id: b.id,
        name: b.name,
        avatar_url: b.avatar_url,
        jobs: mine.length,
        revenue,
        commission_rate: rate,
        commission,
        tips,
        payable: commission + tips,
      }
    }).sort((a, b) => b.payable - a.payable)

    const totals = {
      revenue: rows.reduce((s, r) => s + r.revenue, 0),
      commission: rows.reduce((s, r) => s + r.commission, 0),
      tips: rows.reduce((s, r) => s + r.tips, 0),
      payable: rows.reduce((s, r) => s + r.payable, 0),
      shop_keep: rows.reduce((s, r) => s + (r.revenue - r.commission), 0),
    }

    return json({ data: { period, barbers: rows, totals }, error: null })
  } catch (err) {
    console.error('owner-earnings-get error:', err)
    return error('Failed to compute earnings', 500)
  }
})
