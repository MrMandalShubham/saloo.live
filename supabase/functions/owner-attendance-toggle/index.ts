import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

const IST_DATE = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split('T')[0]

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const { barber_id } = await req.json()
    if (!barber_id) return error('barber_id required', 400)

    const supabase = createAdminClient()
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return error('Shop not found', 404)

    // Verify barber belongs to shop
    const { data: barber } = await supabase
      .from('barbers').select('id').eq('id', barber_id).eq('shop_id', shop.id).single()
    if (!barber) return error('Barber not found', 404)

    // Open shift?
    const { data: open } = await supabase
      .from('attendance')
      .select('id, clock_in')
      .eq('barber_id', barber_id)
      .is('clock_out', null)
      .maybeSingle()

    if (open) {
      // Clock out + set chair offline
      await supabase.from('attendance').update({ clock_out: new Date().toISOString() }).eq('id', open.id)
      await supabase.from('barbers').update({ chair_status: 'offline' }).eq('id', barber_id).catch(() => null)
      return json({ data: { clocked_in: false }, error: null })
    }

    // Clock in + set chair available
    await supabase.from('attendance').insert({ shop_id: shop.id, barber_id, work_date: IST_DATE() })
    await supabase.from('barbers').update({ chair_status: 'available' }).eq('id', barber_id).catch(() => null)
    return json({ data: { clocked_in: true }, error: null })
  } catch (err) {
    console.error('owner-attendance-toggle error:', err)
    return error('Failed to update attendance', 500)
  }
})
