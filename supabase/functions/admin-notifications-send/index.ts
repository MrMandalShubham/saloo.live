import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient, getAuthUser } from '../_shared/supabase-admin.ts'
import { sendPush } from '../_shared/fcm.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { user, error: authErr } = await getAuthUser(req)
    if (!user) return new Response(JSON.stringify({ error: { message: authErr ?? 'Unauthorized' } }), { status: 401, headers: corsHeaders })

    const admin = createAdminClient()
    const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return new Response(JSON.stringify({ error: { message: 'Forbidden' } }), { status: 403, headers: corsHeaders })

    const { title, body, target, user_ids, data: payload } = await req.json()
    if (!title || !body || !target) throw new Error('title, body, and target required')

    let targetUserIds: string[] = []

    if (target === 'specific') {
      if (!user_ids?.length) throw new Error('user_ids required for specific target')
      targetUserIds = user_ids
    } else if (target === 'all') {
      const { data: allUsers } = await admin.from('users').select('id').eq('is_suspended', false)
      targetUserIds = (allUsers ?? []).map((u: any) => u.id)
    } else if (target === 'customers') {
      const { data: customers } = await admin.from('users').select('id').eq('role', 'customer').eq('is_suspended', false)
      targetUserIds = (customers ?? []).map((u: any) => u.id)
    } else if (target === 'shop_owners') {
      const { data: owners } = await admin.from('users').select('id').eq('role', 'shop_owner').eq('is_suspended', false)
      targetUserIds = (owners ?? []).map((u: any) => u.id)
    }

    // Insert notification rows
    if (targetUserIds.length > 0) {
      const notifications = targetUserIds.map((uid: string) => ({
        user_id: uid,
        type: 'system' as const,
        title,
        body,
        is_read: false,
      }))
      for (let i = 0; i < notifications.length; i += 500) {
        await admin.from('notifications').insert(notifications.slice(i, i + 500))
      }
    }

    // Send FCM push per token (best-effort)
    try {
      const { data: tokenUsers } = await admin
        .from('users')
        .select('fcm_token')
        .in('id', targetUserIds)
        .not('fcm_token', 'is', null)
      for (const u of tokenUsers ?? []) {
        if (u.fcm_token) {
          await sendPush({ fcmToken: u.fcm_token, title, body, data: payload }).catch(() => null)
        }
      }
    } catch (_) { /* FCM failure is non-critical */ }

    // Audit log
    await admin.from('admin_actions').insert({
      admin_id: user.id,
      action_type: 'send_notification',
      target_type: 'user',
      target_id: user.id,
      details: { title, body, target, recipient_count: targetUserIds.length },
    })

    return new Response(JSON.stringify({ data: { sent_to: targetUserIds.length } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: { message: e.message } }), { status: 500, headers: corsHeaders })
  }
})
