import { handleCors, json, error } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    const url = new URL(req.url)
    const gender = url.searchParams.get('gender')
    const face = url.searchParams.get('face_shape')
    const hair = url.searchParams.get('hair_type')
    const tag = url.searchParams.get('tag')
    const tags = url.searchParams.get('tags') // comma-separated, OR-match
    const q = url.searchParams.get('q')

    const supabase = createAdminClient()
    let query = supabase
      .from('hairstyles')
      .select('id, name, image_url, gender, face_shapes, hair_types, tags')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(120)

    if (gender && gender !== 'all') query = query.in('gender', [gender, 'unisex'])
    if (face) query = query.contains('face_shapes', [face])
    if (hair) query = query.contains('hair_types', [hair])
    if (tag) query = query.contains('tags', [tag])
    if (tags) {
      const arr = tags.split(',').map((t) => t.trim()).filter(Boolean)
      if (arr.length > 0) query = query.overlaps('tags', arr)
    }
    if (q) query = query.ilike('name', `%${q}%`)

    const { data } = await query
    return json({ data: data ?? [], error: null }, 200, 60)
  } catch (err) {
    console.error('hairstyles-list error:', err)
    return error('Failed to load hairstyles', 500)
  }
})
