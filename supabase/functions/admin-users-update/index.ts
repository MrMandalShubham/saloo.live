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

    const { user_id, role: newRole, is_suspended } = await req.json()
    if (!user_id) throw new Error('user_id required')
    if (user_id === user.id) throw new Error('Cannot modify your own account')

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (newRole !== undefined) {
      if (!['customer', 'shop_owner', 'admin'].includes(newRole)) throw new Error('Invalid role')
      updates.role = newRole
    }
    if (is_suspended !== undefined) updates.is_suspended = is_suspended

    const { error } = await admin.from('users').update(updates).eq('id', user_id)
    if (error) throw error

    // Audit log
    await admin.from('admin_actions').insert({
      admin_id: user.id,
      action_type: is_suspended ? 'suspend_user' : newRole ? 'change_role' : 'update_user',
      target_type: 'user',
      target_id: user_id,
      details: { role: newRole, is_suspended },
    })

    return new Response(JSON.stringify({ data: { success: true } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: { message: e.message } }), { status: 500, headers: corsHeaders })
  }
})
