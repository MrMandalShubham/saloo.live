// Compute available time slots for a shop/barber on a given date.
// Slots are NOT pre-stored — generated from shop hours minus existing bookings/holds/blocks.
//
// PERF: All DB queries run in parallel via Promise.all (6→1 round-trip).
// Supports 1K+ concurrent users hitting this endpoint.

import { handleCors, json, error } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

const SLOT_DURATION = 30  // minutes per slot grid unit
const POPULAR_HOURS = ['10:00', '11:00', '12:00', '17:00', '18:00', '19:00']

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m ?? 0)
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const url = new URL(req.url)
    const shopId = url.pathname.split('/')[url.pathname.split('/').length - 2]
    const date = url.searchParams.get('date')  // YYYY-MM-DD
    const barberId = url.searchParams.get('barber_id')

    if (!shopId || !date) return error('shop_id and date are required', 400)

    const parsedDate = new Date(date + 'T00:00:00')
    const dayOfWeek = parsedDate.getDay()

    const supabase = createAdminClient()

    // ── PARALLEL FETCH: all 6 queries at once ──────────────────────────
    const barbersQuery = supabase
      .from('barbers')
      .select('id, barber_hours(*)')
      .eq('shop_id', shopId)
      .eq('is_active', true)

    if (barberId) barbersQuery.eq('id', barberId)

    const [hoursRes, barbersRes, bookingsRes, holdsRes, blocksRes, breaksRes, shopRes] = await Promise.all([
      // 1. Shop hours for this day
      supabase
        .from('shop_hours')
        .select('*')
        .eq('shop_id', shopId)
        .eq('day_of_week', dayOfWeek)
        .single(),

      // 2. Active barbers (with their custom hours)
      barbersQuery,

      // 3. Existing bookings for this date
      supabase
        .from('bookings')
        .select('barber_id, start_time, end_time')
        .eq('shop_id', shopId)
        .eq('date', date)
        .in('status', ['confirmed', 'in_chair']),

      // 4. Active slot holds
      supabase
        .from('slot_holds')
        .select('barber_id, start_time, end_time')
        .eq('shop_id', shopId)
        .eq('hold_date', date)
        .gt('expires_at', new Date().toISOString()),

      // 5. Manual blocks
      supabase
        .from('slot_blocks')
        .select('barber_id, start_time, end_time')
        .eq('shop_id', shopId)
        .or(`block_date.eq.${date},and(block_date.is.null,day_of_week.eq.${dayOfWeek})`),

      // 6. Shop breaks
      supabase
        .from('shop_breaks')
        .select('start_time, end_time')
        .eq('shop_id', shopId)
        .or(`day_of_week.eq.${dayOfWeek},day_of_week.is.null`),

      // 7. Shop buffer setting
      supabase
        .from('shops')
        .select('slot_buffer_min')
        .eq('id', shopId)
        .single(),
    ])

    const hoursData = hoursRes.data
    if (!hoursData || hoursData.is_closed) {
      return json({ data: { date, slots: [] }, error: null })
    }

    const barbers = barbersRes.data
    if (!barbers?.length) {
      return json({ data: { date, slots: [] }, error: null })
    }

    const barberIds = barbers.map(b => b.id)
    const existingBookings = bookingsRes.data ?? []
    const activeHolds = holdsRes.data ?? []
    const blocks = blocksRes.data ?? []
    const breaks = breaksRes.data ?? []
    const buffer = shopRes.data?.slot_buffer_min ?? 10

    // Build occupied intervals per barber
    const occupied = new Map<string, Array<{ start: number; end: number }>>()
    for (const b of barbers) occupied.set(b.id, [])

    const addInterval = (bId: string | null, start: string, end: string) => {
      const s = timeToMinutes(start)
      const e = timeToMinutes(end)
      if (bId) {
        occupied.get(bId)?.push({ start: s, end: e })
      } else {
        for (const id of barberIds) occupied.get(id)?.push({ start: s, end: e })
      }
    }

    // Only process bookings for relevant barbers
    for (const b of existingBookings) {
      if (barberIds.includes(b.barber_id)) addInterval(b.barber_id, b.start_time, b.end_time)
    }
    for (const h of activeHolds) {
      if (barberIds.includes(h.barber_id)) addInterval(h.barber_id, h.start_time, h.end_time)
    }
    for (const bl of blocks) addInterval(bl.barber_id, bl.start_time, bl.end_time)
    for (const br of breaks) addInterval(null, br.start_time, br.end_time)

    // Generate slots
    const shopOpen = timeToMinutes(hoursData.open_time)
    const shopClose = timeToMinutes(hoursData.close_time)
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const nowMinutes = date === todayStr ? now.getHours() * 60 + now.getMinutes() + 30 : 0

    const slotMap = new Map<string, { available_barbers: string[]; is_popular: boolean }>()

    for (let t = shopOpen; t + SLOT_DURATION <= shopClose; t += SLOT_DURATION) {
      const slotEnd = t + SLOT_DURATION
      const timeStr = minutesToTime(t)

      if (t < nowMinutes) continue

      if (!slotMap.has(timeStr)) {
        slotMap.set(timeStr, { available_barbers: [], is_popular: POPULAR_HOURS.includes(timeStr) })
      }

      for (const barber of barbers) {
        const barberHours = (barber.barber_hours as Array<{ day_of_week: number; open_time: string; close_time: string; is_off: boolean }>)
          ?.find(h => h.day_of_week === dayOfWeek)
        if (barberHours?.is_off) continue
        const barberOpen = barberHours ? timeToMinutes(barberHours.open_time) : shopOpen
        const barberClose = barberHours ? timeToMinutes(barberHours.close_time) : shopClose

        if (t < barberOpen || slotEnd > barberClose) continue

        const intervals = occupied.get(barber.id) ?? []
        const conflict = intervals.some(i =>
          t < i.end + buffer && slotEnd > i.start
        )

        if (!conflict) {
          slotMap.get(timeStr)!.available_barbers.push(barber.id)
        }
      }
    }

    const slots = Array.from(slotMap.entries()).map(([start_time, info]) => ({
      start_time,
      end_time: minutesToTime(timeToMinutes(start_time) + SLOT_DURATION),
      is_available: info.available_barbers.length > 0,
      available_barbers: info.available_barbers,
      is_popular: info.is_popular,
    }))

    return json({ data: { date, slots }, error: null })
  } catch (err) {
    console.error('shops-availability error:', err)
    return error('Failed to compute availability', 500)
  }
})
