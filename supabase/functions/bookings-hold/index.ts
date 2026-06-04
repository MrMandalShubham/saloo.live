// Create a 5-minute slot hold during the payment step.
// Uses a single atomic SQL transaction to prevent race conditions (TOCTOU).
// At 1K concurrent users, multiple people may try to book the same slot simultaneously.

import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { shop_id, barber_id, date, start_time, service_ids, addon_ids = [] } = await req.json()

    if (!shop_id || !barber_id || !date || !start_time || !service_ids?.length) {
      return error('shop_id, barber_id, date, start_time, service_ids are required', 400)
    }

    const supabase = createAdminClient()

    // Fetch services to compute duration and total
    const { data: services, error: svcErr } = await supabase
      .from('services')
      .select('id, price, duration_min, is_addon')
      .in('id', [...service_ids, ...addon_ids])

    if (svcErr || !services?.length) return error('Invalid service IDs', 400)

    const mainServices = services.filter(s => service_ids.includes(s.id) && !s.is_addon)
    const addons = services.filter(s => addon_ids.includes(s.id) && s.is_addon)

    const total_duration = mainServices.reduce((sum, s) => sum + s.duration_min, 0)
    const total_amount = [...mainServices, ...addons].reduce((sum, s) => sum + s.price, 0)

    // Use shop's configured advance percentage (default 10%)
    const { data: shopConfig } = await supabase
      .from('shops')
      .select('advance_percentage')
      .eq('id', shop_id)
      .single()
    const advancePct = shopConfig?.advance_percentage ?? 10
    const advance_amount = Math.ceil(total_amount * (advancePct / 100))

    // Compute end_time
    const [h, m] = start_time.split(':').map(Number)
    const endMin = h * 60 + m + total_duration
    const end_time = `${String(Math.floor(endMin / 60)).padStart(2,'0')}:${String(endMin % 60).padStart(2,'0')}`

    // ── ATOMIC conflict check + insert in a single SQL call ────────────
    // This prevents the TOCTOU race condition where two users check at the
    // same time, both see "available", and both insert holds.
    // The CTE uses FOR UPDATE to lock conflicting rows during the transaction.
    const { data: result, error: txErr } = await supabase.rpc('atomic_hold_slot', {
      p_shop_id: shop_id,
      p_barber_id: barber_id,
      p_user_id: user.id,
      p_hold_date: date,
      p_start_time: start_time,
      p_end_time: end_time,
      p_service_ids: service_ids,
      p_addon_ids: addon_ids,
    })

    if (txErr) {
      // Conflict detected by the atomic function
      if (txErr.message?.includes('SLOT_CONFLICT')) {
        return error('Slot is no longer available', 409)
      }
      if (txErr.message?.includes('HOLD_CONFLICT')) {
        return error('Slot is being held by another user', 409)
      }
      throw txErr
    }

    return json({
      data: {
        hold_id: result.hold_id,
        expires_at: result.expires_at,
        total_duration_min: total_duration,
        total_amount,
        advance_amount,
        end_time,
      },
      error: null,
    })
  } catch (err) {
    console.error('bookings-hold error:', err)
    return error('Failed to hold slot', 500)
  }
})
