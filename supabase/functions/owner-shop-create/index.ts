import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  if (req.method !== 'POST') return error('Method not allowed', 405)

  try {
    const body = await req.json()
    const supabase = createAdminClient()

    // Verify user is a shop_owner
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'shop_owner') {
      return error('Only shop owners can create a shop', 403)
    }

    // Check if user already has a shop
    const { data: existing } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (existing) {
      return error('You already have a shop', 409)
    }

    // Validate required fields
    const { name, phone, address, city, state, pincode } = body
    if (!name || !phone || !address || !city || !state || !pincode) {
      return error('Missing required fields: name, phone, address, city, state, pincode', 400)
    }

    if (!/^\d{6}$/.test(pincode)) {
      return error('Pincode must be exactly 6 digits', 400)
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36)

    const { data: shop, error: insertErr } = await supabase
      .from('shops')
      .insert({
        owner_id: user.id,
        name: name.trim(),
        slug,
        description: body.description?.trim() || null,
        phone: phone.trim(),
        email: body.email?.trim() || null,
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        status: 'pending',
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    // Notify admins about new shop pending approval
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      const notifications = admins.map((a: { id: string }) => ({
        user_id: a.id,
        type: 'system' as const,
        title: 'New Shop Pending Approval',
        body: `${name} has applied to join the platform.`,
        data: { shop_id: shop.id },
      }))
      await supabase.from('notifications').insert(notifications)
    }

    return json({ data: shop, error: null })
  } catch (err) {
    console.error('owner-shop-create error:', err)
    return error('Failed to create shop', 500)
  }
})
