import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const bookingId = new URL(req.url).pathname.split('/').pop()
    if (!bookingId) return error('booking_id is required', 400)

    const supabase = createAdminClient()

    const { data: booking, error: dbErr } = await supabase
      .from('bookings')
      .select(`
        *,
        shop:shops(id, name, address, phone, photos, lat, lng),
        barber:barbers(id, name, avatar_url, specialties),
        payment:payments(id, amount, type, status, method, created_at),
        review:reviews(id, rating, text, photos, created_at),
        dispute:disputes(id, reason, status, created_at)
      `)
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .single()

    if (dbErr || !booking) return error('Booking not found', 404)

    // Fetch services separately (array of IDs)
    const allServiceIds = [...(booking.service_ids ?? []), ...(booking.addon_ids ?? [])]
    const { data: services } = await supabase
      .from('services')
      .select('id, name, price, duration_min, is_addon, category')
      .in('id', allServiceIds)

    return json({ data: { ...booking, services: services ?? [] }, error: null })
  } catch (err) {
    console.error('bookings-get error:', err)
    return error('Failed to fetch booking', 500)
  }
})
