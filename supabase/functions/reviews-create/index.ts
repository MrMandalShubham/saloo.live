import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { booking_id, rating, barber_rating, wait_rating, cleanliness_rating, text, photo_base64_list = [] } = await req.json()

    if (!booking_id || !rating || rating < 1 || rating > 5) {
      return error('booking_id and rating (1–5) are required', 400)
    }

    const supabase = createAdminClient()

    // Validate booking belongs to user and is completed
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, shop_id, barber_id, user_id')
      .eq('id', booking_id)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .single()

    if (bookingErr || !booking) return error('Booking not found or not eligible for review', 404)

    // Check no existing review
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', booking_id)
      .maybeSingle()

    if (existing) return error('Review already submitted for this booking', 409)

    // Upload photos to Supabase Storage
    const photoUrls: string[] = []
    for (let i = 0; i < Math.min(photo_base64_list.length, 3); i++) {
      const base64 = photo_base64_list[i]
      const fileName = `${booking_id}/${i}_${Date.now()}.jpg`
      const binary = Uint8Array.from(atob(base64.replace(/^data:image\/\w+;base64,/, '')), c => c.charCodeAt(0))

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('review-photos')
        .upload(fileName, binary, { contentType: 'image/jpeg', upsert: false })

      if (!uploadErr && uploadData) {
        const { data: { publicUrl } } = supabase.storage.from('review-photos').getPublicUrl(fileName)
        photoUrls.push(publicUrl)
      }
    }

    // Create review
    const { data: review, error: reviewErr } = await supabase
      .from('reviews')
      .insert({
        booking_id,
        user_id: user.id,
        shop_id: booking.shop_id,
        barber_id: booking.barber_id,
        rating,
        barber_rating: barber_rating ?? null,
        wait_rating: wait_rating ?? null,
        cleanliness_rating: cleanliness_rating ?? null,
        text: text ?? null,
        photos: photoUrls,
      })
      .select()
      .single()

    if (reviewErr) throw reviewErr

    // Award loyalty points for review (50 bonus for photo review)
    const bonusPoints = photoUrls.length > 0 ? 50 : 0
    if (bonusPoints > 0) {
      const { data: userData } = await supabase
        .from('users')
        .select('loyalty_points')
        .eq('id', user.id)
        .single()

      const newBalance = (userData?.loyalty_points ?? 0) + bonusPoints
      await Promise.all([
        supabase.from('users').update({ loyalty_points: newBalance }).eq('id', user.id),
        supabase.from('loyalty_transactions').insert({
          user_id: user.id,
          booking_id,
          points: bonusPoints,
          type: 'bonus',
          description: 'Photo review bonus',
          balance_after: newBalance,
        }),
      ])
    }

    return json({ data: review, error: null })
  } catch (err) {
    console.error('reviews-create error:', err)
    return error('Failed to submit review', 500)
  }
})
