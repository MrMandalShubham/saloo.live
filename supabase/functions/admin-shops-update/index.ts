import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient, getAuthUser } from '../_shared/supabase-admin.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const user = await getAuthUser(req)
    if (!user) return new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), { status: 401, headers: corsHeaders })

    const admin = createAdminClient()
    const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return new Response(JSON.stringify({ error: { message: 'Forbidden' } }), { status: 403, headers: corsHeaders })

    const { shop_id, status, reason } = await req.json()
    if (!shop_id || !status) throw new Error('shop_id and status required')
    if (!['verified', 'suspended', 'pending', 'rejected'].includes(status)) throw new Error('Invalid status')

    const { data: shop, error } = await admin
      .from('shops')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', shop_id)
      .select('id, name, owner_id')
      .single()
    if (error) throw error

    // Audit log
    await admin.from('admin_actions').insert({
      admin_id: user.id,
      action_type: `${status}_shop`,
      target_type: 'shop',
      target_id: shop_id,
      details: { previous_status: shop.status, new_status: status, reason: reason ?? null },
    })

    // Notify shop owner
    const actionLabel = status === 'verified' ? 'approved' : status === 'suspended' ? 'suspended' : status === 'rejected' ? 'rejected' : 'updated'
    await admin.from('notifications').insert({
      user_id: shop.owner_id,
      type: 'system',
      title: `Shop ${actionLabel}`,
      body: reason ? `Your shop "${shop.name}" has been ${actionLabel}. Reason: ${reason}` : `Your shop "${shop.name}" has been ${actionLabel}.`,
      is_read: false,
    })

    return new Response(JSON.stringify({ data: { success: true } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: { message: e.message } }), { status: 500, headers: corsHeaders })
  }
})
