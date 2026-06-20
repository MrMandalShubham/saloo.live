// Hold N slots at the same time for a group booking, auto-assigning distinct barbers.
import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

const addMinutes = (start: string, mins: number) => {
  const [h, m] = start.split(':').map(Number)
  const end = h * 60 + m + mins
  return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { shop_id, date, start_time, members } = await req.json()
    if (!shop_id || !date || !start_time || !Array.isArray(members) || members.length === 0) {
      return error('shop_id, date, start_time and members are required', 400)
    }
    if (members.length > 6) return error('Group size is limited to 6', 400)

    const supabase = createAdminClient()

    // Active barbers for the shop
    const { data: barbers } = await supabase
      .from('barbers').select('id').eq('shop_id', shop_id).eq('is_active', true)
    const barberIds = (barbers ?? []).map((b: any) => b.id)
    if (barberIds.length < members.length) {
      return error(`This shop has ${barberIds.length} barber(s) — not enough for a group of ${members.length}`, 422)
    }

    // Shop advance %
    const { data: shop } = await supabase.from('shops').select('advance_percentage').eq('id', shop_id).single()
    const advancePct = (shop?.advance_percentage ?? 10) / 100

    // Resolve services for all members
    const allIds = [...new Set(members.flatMap((m: any) => [...(m.service_ids ?? []), ...(m.addon_ids ?? [])]))]
    const { data: services } = await supabase.from('services').select('id, price, duration_min, is_addon').in('id', allIds)
    const svcMap = Object.fromEntries((services ?? []).map((s: any) => [s.id, s]))

    const group_id = crypto.randomUUID()
    const holds: any[] = []
    const usedBarbers = new Set<string>()

    // Greedy: assign each member a distinct free barber via the atomic hold RPC
    for (let i = 0; i < members.length; i++) {
      const m = members[i]
      const mainIds = (m.service_ids ?? []).filter((id: string) => svcMap[id] && !svcMap[id].is_addon)
      const addonIds = (m.addon_ids ?? []).filter((id: string) => svcMap[id]?.is_addon)
      if (mainIds.length === 0) {
        await rollback(supabase, holds)
        return error(`Select at least one service for ${m.label || `member ${i + 1}`}`, 400)
      }
      const duration = mainIds.reduce((s: number, id: string) => s + (svcMap[id]?.duration_min ?? 0), 0)
      const total = [...mainIds, ...addonIds].reduce((s: number, id: string) => s + (svcMap[id]?.price ?? 0), 0)
      const end_time = addMinutes(start_time, duration)

      let placed = false
      for (const bid of barberIds) {
        if (usedBarbers.has(bid)) continue
        const { data: result, error: txErr } = await supabase.rpc('atomic_hold_slot', {
          p_shop_id: shop_id, p_barber_id: bid, p_user_id: user.id,
          p_hold_date: date, p_start_time: start_time, p_end_time: end_time,
          p_service_ids: mainIds, p_addon_ids: addonIds,
        })
        if (txErr) {
          if (txErr.message?.includes('CONFLICT')) continue // barber busy, try next
          await rollback(supabase, holds)
          throw txErr
        }
        usedBarbers.add(bid)
        holds.push({
          hold_id: result.hold_id, barber_id: bid, label: m.label || `Member ${i + 1}`,
          total_amount: total, advance_amount: Math.ceil(total * advancePct), end_time,
        })
        placed = true
        break
      }
      if (!placed) {
        await rollback(supabase, holds)
        return error('Not enough barbers are free at this time. Try another slot.', 409)
      }
    }

    const total_amount = holds.reduce((s, h) => s + h.total_amount, 0)
    const total_advance = holds.reduce((s, h) => s + h.advance_amount, 0)

    return json({ data: { group_id, holds, total_amount, total_advance }, error: null })
  } catch (err) {
    console.error('group-hold error:', err)
    return error('Failed to hold group slots', 500)
  }
})

async function rollback(supabase: any, holds: any[]) {
  for (const h of holds) {
    await supabase.from('slot_holds').delete().eq('id', h.hold_id).catch(() => null)
  }
}
