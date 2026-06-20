import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { booking_id, tip_amount } = await req.json()
    if (!booking_id) return error('booking_id required', 400)
    const tip = Number(tip_amount)
    if (isNaN(tip) || tip < 0) return error('Invalid tip amount', 400)

    const supabase = createAdminClient()

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return error('Shop not found', 404)

    const { data: booking } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('id', booking_id)
      .eq('shop_id', shop.id)
      .single()
    if (!booking) return error('Booking not found', 404)

    const { data: updated, error: updErr } = await supabase
      .from('bookings')
      .update({ tip_amount: tip, updated_at: new Date().toISOString() })
      .eq('id', booking_id)
      .select('id, tip_amount')
      .single()
    if (updErr) throw updErr

    return json({ data: updated, error: null })
  } catch (err) {
    console.error('owner-booking-tip error:', err)
    return error('Failed to record tip', 500)
  }
})
