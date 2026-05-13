import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const supabase = createAdminClient()

    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!shop) return error('Shop not found', 404)

    if (req.method === 'GET') {
      const url = new URL(req.url)
      const from = url.searchParams.get('from')
      const to   = url.searchParams.get('to') ?? from

      let query = supabase
        .from('slot_blocks')
        .select('*')
        .eq('shop_id', shop.id)
        .order('date')
        .order('start_time')

      if (from) query = query.gte('date', from)
      if (to)   query = query.lte('date', to)

      const { data, error: dbErr } = await query
      if (dbErr) throw dbErr

      return json({ data, error: null })
    }

    if (req.method === 'POST') {
      const { barber_id, date, start_time, end_time, reason } = await req.json()
      if (!date || !start_time || !end_time) return error('date, start_time, end_time required', 400)

      const { data, error: dbErr } = await supabase
        .from('slot_blocks')
        .insert({ shop_id: shop.id, barber_id: barber_id ?? null, date, start_time, end_time, reason: reason ?? null })
        .select()
        .single()

      if (dbErr) throw dbErr

      return json({ data, error: null })
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url)
      const blockId = url.searchParams.get('id')
      if (!blockId) return error('Block ID required', 400)

      const { error: dbErr } = await supabase
        .from('slot_blocks')
        .delete()
        .eq('id', blockId)
        .eq('shop_id', shop.id)

      if (dbErr) throw dbErr

      return json({ data: { success: true }, error: null })
    }

    return error('Method not allowed', 405)
  } catch (err) {
    console.error('owner-blocks-manage error:', err)
    return error('Failed to manage blocks', 500)
  }
})
