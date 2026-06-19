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

    const { data: shop } = await supabase
      .from('shops')
      .select('id, name, walk_in_enabled')
      .eq('owner_id', user.id)
      .single()

    if (!shop) return error('Shop not found', 404)

    // All of today's entries
    const { data: entries } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('shop_id', shop.id)
      .eq('queue_date', today)
      .order('joined_at', { ascending: true })

    // Resolve service names referenced in queue
    const allServiceIds = [...new Set((entries ?? []).flatMap((e: any) => e.service_ids ?? []))]
    let serviceMap: Record<string, { name: string; duration_min: number }> = {}
    if (allServiceIds.length > 0) {
      const { data: svcs } = await supabase
        .from('services')
        .select('id, name, duration_min')
        .in('id', allServiceIds)
      serviceMap = Object.fromEntries((svcs ?? []).map((s: any) => [s.id, { name: s.name, duration_min: s.duration_min }]))
    }

    // Barbers with live chair status
    const { data: barbers } = await supabase
      .from('barbers')
      .select('id, name, chair_status, is_active, avatar_url')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .order('name')

    const all = entries ?? []
    const active = all.filter((e: any) => ['waiting', 'called', 'in_chair'].includes(e.status))
    const waiting = active.filter((e: any) => e.status === 'waiting')

    const enrich = (e: any) => ({
      ...e,
      services: (e.service_ids ?? []).map((id: string) => serviceMap[id]?.name ?? 'Service'),
    })

    return json({
      data: {
        shop: { id: shop.id, name: shop.name, walk_in_enabled: shop.walk_in_enabled },
        barbers: barbers ?? [],
        entries: all.map(enrich),
        active: active.map(enrich),
        stats: {
          waiting: waiting.length,
          in_chair: all.filter((e: any) => e.status === 'in_chair').length,
          called: all.filter((e: any) => e.status === 'called').length,
          completed_today: all.filter((e: any) => e.status === 'completed').length,
        },
      },
      error: null,
    })
  } catch (err) {
    console.error('owner-queue-list error:', err)
    return error('Failed to load queue', 500)
  }
})
