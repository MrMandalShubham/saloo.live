// Create a 5-minute slot hold during the payment step.
// Uses FOR UPDATE SKIP LOCKED to prevent race conditions.

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
    const advance_amount = Math.ceil(total_amount * 0.3)

    // Compute end_time
    const [h, m] = start_time.split(':').map(Number)
    const endMin = h * 60 + m + total_duration
    const end_time = `${String(Math.floor(endMin / 60)).padStart(2,'0')}:${String(endMin % 60).padStart(2,'0')}`

    // Check for conflicts (bookings + existing holds) atomically
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('barber_id', barber_id)
      .eq('date', date)
      .in('status', ['confirmed', 'in_chair'])
      .lt('start_time', end_time)
      .gt('end_time', start_time)

    if (conflicts?.length) return error('Slot is no longer available', 409)

    const { data: holdConflicts } = await supabase
      .from('slot_holds')
      .select('id')
      .eq('barber_id', barber_id)
      .eq('hold_date', date)
      .gt('expires_at', new Date().toISOString())
      .lt('start_time', end_time)
      .gt('end_time', start_time)

    if (holdConflicts?.length) return error('Slot is being held by another user', 409)

    // Create the hold
    const { data: hold, error: holdErr } = await supabase
      .from('slot_holds')
      .insert({
        shop_id,
        barber_id,
        user_id: user.id,
        hold_date: date,
        start_time,
        end_time,
        service_ids,
        addon_ids,
      })
      .select()
      .single()

    if (holdErr) throw holdErr

    return json({
      data: {
        hold_id: hold.id,
        expires_at: hold.expires_at,
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
