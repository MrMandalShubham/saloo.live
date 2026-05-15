import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient, getAuthUser } from '../_shared/supabase-admin.ts'
import { createRazorpayRefund } from '../_shared/razorpay.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const user = await getAuthUser(req)
    if (!user) return new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), { status: 401, headers: corsHeaders })

    const admin = createAdminClient()
    const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return new Response(JSON.stringify({ error: { message: 'Forbidden' } }), { status: 403, headers: corsHeaders })

    const { dispute_id, resolution, resolution_note, refund_amount } = await req.json()
    if (!dispute_id || !resolution || !resolution_note) throw new Error('dispute_id, resolution, and resolution_note required')

    const validResolutions = ['refund_customer', 'pay_shop', 'split', 'dismissed']
    if (!validResolutions.includes(resolution)) throw new Error('Invalid resolution')

    // Fetch dispute with booking + payment
    const { data: dispute, error: de } = await admin
      .from('disputes')
      .select('id, status, booking_id, booking:bookings(user_id, shop_id, total_amount, payment:payments(razorpay_payment_id, amount))')
      .eq('id', dispute_id)
      .single()
    if (de) throw de
    if (['resolved_refund', 'resolved_no_refund', 'dismissed'].includes(dispute.status)) throw new Error('Dispute already resolved')

    // Trigger Razorpay refund if needed
    if (resolution === 'refund_customer' || resolution === 'split') {
      const payment = (dispute.booking as any)?.payment?.[0]
      if (payment?.razorpay_payment_id && refund_amount) {
        await createRazorpayRefund(payment.razorpay_payment_id, refund_amount)
        await admin.from('payments').insert({
          booking_id: dispute.booking_id,
          shop_id: (dispute.booking as any).shop_id,
          type: 'refund',
          amount: refund_amount,
          status: 'captured',
          razorpay_payment_id: payment.razorpay_payment_id,
        })
      }
    }

    // Map resolution to valid dispute status
    const statusMap: Record<string, string> = {
      refund_customer: 'resolved_refund',
      pay_shop: 'resolved_no_refund',
      split: 'resolved_refund',
      dismissed: 'dismissed',
    }

    // Update dispute
    await admin.from('disputes').update({
      status: statusMap[resolution] ?? 'dismissed',
      resolution,
      resolution_note,
      resolved_at: new Date().toISOString(),
    }).eq('id', dispute_id)

    // Audit log
    await admin.from('admin_actions').insert({
      admin_id: user.id,
      action_type: 'resolve_dispute',
      target_type: 'dispute',
      target_id: dispute_id,
      details: { resolution, resolution_note, refund_amount: refund_amount ?? null },
    })

    // Notify customer
    await admin.from('notifications').insert({
      user_id: (dispute.booking as any).user_id,
      type: 'dispute_update',
      title: 'Dispute Resolved',
      body: `Your dispute has been resolved. Decision: ${resolution.replace(/_/g, ' ')}. ${resolution_note}`,
      is_read: false,
    })

    return new Response(JSON.stringify({ data: { success: true } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: { message: e.message } }), { status: 500, headers: corsHeaders })
  }
})
