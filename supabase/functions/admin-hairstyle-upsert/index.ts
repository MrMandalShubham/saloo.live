import { handleCors, json, error } from '../_shared/cors.ts'
import { getAuthUser, createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return error('Method not allowed', 405)

  const { user, error: authErr } = await getAuthUser(req)
  if (!user) return error(authErr ?? 'Unauthorized', 401)

  try {
    const admin = createAdminClient()
    const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return error('Forbidden', 403)

    const body = await req.json()
    if (!body.name || !body.image_url) return error('name and image_url are required', 400)

    const payload: Record<string, unknown> = {
      name: body.name,
      image_url: body.image_url,
      description: body.description ?? null,
      gender: body.gender ?? 'men',
      face_shapes: Array.isArray(body.face_shapes) ? body.face_shapes : [],
      hair_types: Array.isArray(body.hair_types) ? body.hair_types : [],
      tags: Array.isArray(body.tags) ? body.tags : [],
      is_active: body.is_active ?? true,
      sort_order: body.sort_order ?? 0,
      updated_at: new Date().toISOString(),
    }

    let data, dbErr
    if (body.id) {
      const r = await admin.from('hairstyles').update(payload).eq('id', body.id).select().single()
      data = r.data; dbErr = r.error
    } else {
      const r = await admin.from('hairstyles').insert(payload).select().single()
      data = r.data; dbErr = r.error
    }
    if (dbErr) throw dbErr

    return json({ data, error: null })
  } catch (err) {
    console.error('admin-hairstyle-upsert error:', err)
    return error('Failed to save hairstyle', 500)
  }
})
