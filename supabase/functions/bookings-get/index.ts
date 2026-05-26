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

    // Try as customer first, then as shop owner
    let booking: any = null

    // Check as customer
    const { data: customerBooking } = await supabase
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

    if (customerBooking) {
      booking = customerBooking
    } else {
      // Check as shop owner
      const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (shop) {
        const { data: ownerBooking } = await supabase
          .from('bookings')
          .select(`
            *,
            shop:shops(id, name, address, phone, photos, lat, lng),
            barber:barbers(id, name, avatar_url, specialties),
            payment:payments(id, amount, type, status, method, created_at),
            review:reviews(id, rating, text, photos, created_at),
            dispute:disputes(id, reason, status, created_at),
            user:users(name, phone, avatar_url)
          `)
          .eq('id', bookingId)
          .eq('shop_id', shop.id)
          .single()

        booking = ownerBooking
      }
    }

    if (!booking) return error('Booking not found', 404)

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
