import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'
import { sendPush } from '../_shared/fcm.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const url = new URL(req.url)
    const bookingId = url.pathname.split('/').pop()
    if (!bookingId) return error('Booking ID required', 400)

    const supabase = createAdminClient()

    const { data: booking } = await supabase
      .from('bookings')
      .select('id, status, user_id, shop_id, owner_completed, customer_completed, advance_amount, booking_ref, total_amount')
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .single()

    if (!booking) return error('Booking not found', 404)
    if (booking.status !== 'in_chair') return error('Booking is not in service', 422)
    if (booking.customer_completed) return error('Already confirmed', 422)

    const updates: Record<string, unknown> = {
      customer_completed: true,
      updated_at: new Date().toISOString(),
    }

    // If owner also completed → move to completed
    const bothDone = booking.owner_completed
    if (bothDone) {
      updates.status = 'completed'
    }

    const { data, error: updateErr } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .select()
      .single()

    if (updateErr) throw updateErr

    // Get shop info
    const { data: shop } = await supabase
      .from('shops')
      .select('id, name, owner_id')
      .eq('id', booking.shop_id)
      .single()

    if (bothDone && shop) {
      // ── Wallet: release hold ──
      try {
        const advanceAmt = booking.advance_amount ?? 0
        if (advanceAmt > 0) {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('id, balance, hold_amount, total_released')
            .eq('shop_id', shop.id)
            .single()

          if (wallet) {
            const { data: existingTx } = await supabase
              .from('wallet_transactions')
              .select('id')
              .eq('wallet_id', wallet.id)
              .eq('booking_id', bookingId)
              .in('type', ['release', 'cancel'])
              .limit(1)

            if (!existingTx || existingTx.length === 0) {
              const newHold = Math.max(0, (wallet.hold_amount ?? 0) - advanceAmt)
              const newBalance = (wallet.balance ?? 0) + advanceAmt
              const newReleased = (wallet.total_released ?? 0) + advanceAmt

              await supabase.from('wallets').update({
                balance: newBalance,
                hold_amount: newHold,
                total_released: newReleased,
                updated_at: new Date().toISOString(),
              }).eq('id', wallet.id)

              await supabase.from('wallet_transactions').insert({
                wallet_id: wallet.id,
                booking_id: bookingId,
                amount: advanceAmt,
                type: 'release',
                description: `Released for ${booking.booking_ref} (dual confirmed)`,
                balance_after: newBalance,
                hold_after: newHold,
              })
            }
          }
        }
      } catch (walletErr) {
        console.error('Wallet release error (non-fatal):', walletErr)
      }

      // ── Loyalty points ──
      try {
        const bookingDate = new Date()
        const dayOfWeek = bookingDate.getDay()
        const multiplier = dayOfWeek >= 1 && dayOfWeek <= 4 ? 1.5 : 1
        const earnedPoints = Math.floor((booking.total_amount ?? 0) * multiplier)

        const { data: userData } = await supabase
          .from('users')
          .select('loyalty_points')
          .eq('id', user.id)
          .single()

        const newBalance = (userData?.loyalty_points ?? 0) + earnedPoints

        await Promise.all([
          supabase.from('users').update({ loyalty_points: newBalance }).eq('id', user.id),
          supabase.from('loyalty_transactions').insert({
            user_id: user.id,
            booking_id: bookingId,
            points: earnedPoints,
            type: 'earn',
            description: `Booking ${booking.booking_ref}`,
            balance_after: newBalance,
          }),
        ])
      } catch (loyaltyErr) {
        console.error('Loyalty points error (non-fatal):', loyaltyErr)
      }

      // ── Referral + milestone rewards (non-fatal) ──
      try {
        // Helper: credit loyalty points to any user + ledger entry + optional notification
        const award = async (uid: string, points: number, description: string, notif?: { title: string; body: string }) => {
          const { data: u } = await supabase.from('users').select('loyalty_points, fcm_token').eq('id', uid).single()
          const newBal = (u?.loyalty_points ?? 0) + points
          await supabase.from('users').update({ loyalty_points: newBal }).eq('id', uid)
          await supabase.from('loyalty_transactions').insert({
            user_id: uid, booking_id: bookingId, points, type: 'bonus', description, balance_after: newBal,
          })
          if (notif) {
            await supabase.from('notifications').insert({ user_id: uid, type: 'loyalty_earned', title: notif.title, body: notif.body, data: { booking_id: bookingId } }).catch(() => null)
            if (u?.fcm_token) sendPush({ fcmToken: u.fcm_token, title: notif.title, body: notif.body }).catch(() => null)
          }
        }

        // How many completed bookings does this customer now have?
        const { count: completedCount } = await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'completed')
        const visits = completedCount ?? 0

        // Referral: pay out on the referred user's FIRST completed booking
        const { data: me } = await supabase
          .from('users')
          .select('referred_by, referral_rewarded')
          .eq('id', user.id)
          .single()

        if (me?.referred_by && !me.referral_rewarded && visits === 1) {
          await supabase.from('users').update({ referral_rewarded: true }).eq('id', user.id)
          await award(user.id, 100, 'Referral welcome bonus', { title: 'Welcome bonus! 🎁', body: 'You earned 100 points for joining via a referral.' })
          await award(me.referred_by, 200, 'Friend referral reward', { title: 'Referral reward! 🤝', body: 'A friend you referred completed their first booking. +200 points!' })
        }

        // Milestone rewards by visit count
        const MILESTONES: Record<number, number> = { 5: 100, 10: 250, 20: 500, 50: 1500 }
        if (MILESTONES[visits]) {
          await award(user.id, MILESTONES[visits], `${visits}-visit milestone reward`, {
            title: `Badge unlocked: ${visits} visits 🎉`,
            body: `You've hit ${visits} visits! Here's ${MILESTONES[visits]} bonus points.`,
          })
        }
      } catch (growthErr) {
        console.error('Referral/milestone error (non-fatal):', growthErr)
      }

      // Notify owner
      if (shop.owner_id) {
        await supabase.from('notifications').insert({
          user_id: shop.owner_id,
          type: 'booking_completed',
          title: 'Service Confirmed!',
          body: `Customer confirmed service completion for ${booking.booking_ref}. Payment released to wallet.`,
          data: { booking_id: bookingId },
        })
        const { data: owner } = await supabase.from('users').select('fcm_token').eq('id', shop.owner_id).single()
        if (owner?.fcm_token) {
          await sendPush({ fcmToken: owner.fcm_token, title: 'Service Confirmed! ✅', body: `${booking.booking_ref} completed. Payment released.` }).catch(() => null)
        }
      }

      // Notify customer
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'booking_completed',
        title: 'Visit Complete!',
        body: `Your visit to ${shop.name} is complete. Leave a review!`,
        data: { booking_id: bookingId },
      })
    } else if (shop) {
      // Customer confirmed but owner hasn't yet — notify owner
      if (shop.owner_id) {
        await supabase.from('notifications').insert({
          user_id: shop.owner_id,
          type: 'booking_completed',
          title: 'Customer Confirmed',
          body: `Customer confirmed their service for ${booking.booking_ref}. Please confirm from your side to release payment.`,
          data: { booking_id: bookingId },
        })
        const { data: owner } = await supabase.from('users').select('fcm_token').eq('id', shop.owner_id).single()
        if (owner?.fcm_token) {
          await sendPush({ fcmToken: owner.fcm_token, title: 'Customer Confirmed ✅', body: `${booking.booking_ref} — confirm from your side to complete.` }).catch(() => null)
        }
      }
    }

    return json({ data: { ...data, both_completed: bothDone }, error: null })
  } catch (err) {
    console.error('bookings-complete error:', err)
    return error('Failed to complete booking', 500)
  }
})
