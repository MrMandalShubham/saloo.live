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
    const date = url.searchParams.get('date') || IST_DATE()

    const supabase = createAdminClient()

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return error('Shop not found', 404)

    const [barbersRes, bookingsRes] = await Promise.all([
      supabase.from('barbers').select('id, name, avatar_url, chair_status').eq('shop_id', shop.id).eq('is_active', true).order('name'),
      supabase.from('bookings')
        .select('id, booking_ref, start_time, end_time, status, barber_id, service_ids, user:users(name)')
        .eq('shop_id', shop.id)
        .eq('date', date)
        .not('status', 'in', '("cancelled","expired")')
        .order('start_time'),
    ])

    const barbers = barbersRes.data ?? []
    const bookings = bookingsRes.data ?? []

    // Who's clocked in today (only meaningful for today)
    const { data: openShifts } = await supabase
      .from('attendance').select('barber_id').eq('shop_id', shop.id).is('clock_out', null)
    const clockedIn = new Set((openShifts ?? []).map((a: any) => a.barber_id))

    // Resolve service names
    const allServiceIds = [...new Set(bookings.flatMap((b: any) => b.service_ids ?? []))]
    let serviceMap: Record<string, string> = {}
    if (allServiceIds.length > 0) {
      const { data: svcs } = await supabase.from('services').select('id, name').in('id', allServiceIds)
      serviceMap = Object.fromEntries((svcs ?? []).map((s: any) => [s.id, s.name]))
    }

    const shape = (b: any) => ({
      id: b.id,
      booking_ref: b.booking_ref,
      start_time: b.start_time,
      end_time: b.end_time,
      status: b.status,
      customer_name: b.user?.name ?? 'Guest',
      services: (b.service_ids ?? []).map((id: string) => serviceMap[id] ?? 'Service'),
    })

    const columns = barbers.map((bar: any) => ({
      barber_id: bar.id,
      name: bar.name,
      avatar_url: bar.avatar_url,
      chair_status: bar.chair_status,
      clocked_in: clockedIn.has(bar.id),
      bookings: bookings.filter((b: any) => b.barber_id === bar.id).map(shape),
    }))

    const unassigned = bookings.filter((b: any) => !b.barber_id).map(shape)

    return json({
      data: {
        date,
        columns,
        unassigned,
        total: bookings.length,
      },
      error: null,
    })
  } catch (err) {
    console.error('owner-calendar-get error:', err)
    return error('Failed to load calendar', 500)
  }
})
