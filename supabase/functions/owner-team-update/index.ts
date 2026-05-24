// Update barber profile: basic info, portfolio, linked services
import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  if (req.method !== 'POST' && req.method !== 'PATCH') return error('Method not allowed', 405)

  try {
    const url = new URL(req.url)
    const barberId = url.pathname.split('/').pop()
    if (!barberId) return error('Barber ID required', 400)

    const body = await req.json()
    const supabase = createAdminClient()

    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!shop) return error('Shop not found', 404)

    // Verify barber belongs to this shop
    const { data: barber } = await supabase
      .from('barbers')
      .select('id')
      .eq('id', barberId)
      .eq('shop_id', shop.id)
      .single()

    if (!barber) return error('Barber not found', 404)

    // ── Update barber profile fields ──
    const allowed = ['name', 'phone', 'email', 'specialties', 'bio', 'is_active',
      'avatar_url', 'experience_years', 'languages', 'instagram_handle', 'experience_level']
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    const { data: updated, error: dbErr } = await supabase
      .from('barbers')
      .update(updates)
      .eq('id', barberId)
      .select()
      .single()

    if (dbErr) throw dbErr

    // ── Sync barber_services if provided ──
    if (body.service_ids && Array.isArray(body.service_ids)) {
      // Delete existing and re-insert
      await supabase.from('barber_services').delete().eq('barber_id', barberId)
      if (body.service_ids.length > 0) {
        const rows = body.service_ids.map((sid: string) => ({ barber_id: barberId, service_id: sid }))
        const { error: svcErr } = await supabase.from('barber_services').insert(rows)
        if (svcErr) console.error('barber_services sync error:', svcErr)
      }
    }

    // ── Add portfolio images if provided ──
    if (body.portfolio_add && Array.isArray(body.portfolio_add)) {
      const rows = body.portfolio_add.map((p: any) => ({
        barber_id: barberId,
        image_url: p.image_url,
        caption: p.caption || null,
        is_before_after: p.is_before_after || false,
      }))
      if (rows.length) {
        const { error: pErr } = await supabase.from('barber_portfolio').insert(rows)
        if (pErr) console.error('portfolio insert error:', pErr)
      }
    }

    // ── Delete portfolio images if provided ──
    if (body.portfolio_delete && Array.isArray(body.portfolio_delete)) {
      for (const id of body.portfolio_delete) {
        await supabase.from('barber_portfolio').delete().eq('id', id).eq('barber_id', barberId)
      }
    }

    // Fetch updated data with relations
    const { data: fullBarber } = await supabase
      .from('barbers')
      .select('*, portfolio:barber_portfolio(*), barber_services(service_id)')
      .eq('id', barberId)
      .single()

    return json({ data: fullBarber, error: null })
  } catch (err) {
    console.error('owner-team-update error:', err)
    return error('Failed to update barber', 500)
  }
})
