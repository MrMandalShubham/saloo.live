import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { booking_id, reason, description, photo_base64_list = [] } = await req.json()

    if (!booking_id || !reason || !description) {
      return error('booking_id, reason, and description are required', 400)
    }
    if (description.length < 30) return error('Description must be at least 30 characters', 400)

    const supabase = createAdminClient()

    // Validate booking
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, shop_id, status, advance_amount, date, created_at')
      .eq('id', booking_id)
      .eq('user_id', user.id)
      .single()

    if (!booking) return error('Booking not found', 404)
    if (!['completed', 'no_show'].includes(booking.status)) {
      return error('Disputes can only be raised for completed or no-show bookings', 409)
    }

    // Check existing dispute
    const { data: existing } = await supabase
      .from('disputes')
      .select('id')
      .eq('booking_id', booking_id)
      .maybeSingle()

    if (existing) return error('A dispute already exists for this booking', 409)

    // Check 24h window for escrow (only for no-show/same-day disputes)
    const bookingDate = new Date(booking.date + 'T23:59:59+05:30')
    const hoursElapsed = (Date.now() - bookingDate.getTime()) / 3600000
    const payment_in_escrow = hoursElapsed < 24

    // Upload photos
    const photoUrls: string[] = []
    for (let i = 0; i < Math.min(photo_base64_list.length, 5); i++) {
      const base64 = photo_base64_list[i]
      const fileName = `disputes/${booking_id}/${i}_${Date.now()}.jpg`
      const binary = Uint8Array.from(atob(base64.replace(/^data:image\/\w+;base64,/, '')), c => c.charCodeAt(0))
      const { data: uploadData } = await supabase.storage
        .from('review-photos')
        .upload(fileName, binary, { contentType: 'image/jpeg', upsert: false })
      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage.from('review-photos').getPublicUrl(fileName)
        photoUrls.push(publicUrl)
      }
    }

    const { data: dispute, error: disputeErr } = await supabase
      .from('disputes')
      .insert({
        booking_id,
        user_id: user.id,
        shop_id: booking.shop_id,
        reason,
        description,
        photos: photoUrls,
        payment_in_escrow,
      })
      .select()
      .single()

    if (disputeErr) throw disputeErr

    // Save notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'dispute',
      title: 'Dispute Raised',
      body: 'Your dispute has been received. We\'ll resolve it within 5 business days.',
      data: { dispute_id: dispute.id, booking_id },
    })

    return json({ data: dispute, error: null })
  } catch (err) {
    console.error('disputes-create error:', err)
    return error('Failed to create dispute', 500)
  }
})
