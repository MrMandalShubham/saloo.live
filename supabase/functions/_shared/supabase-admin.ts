import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export function createUserClient(req: Request) {
  const authHeader = req.headers.get('Authorization')
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: authHeader ?? '' } },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )
}

export async function getAuthUser(req: Request) {
  const client = createUserClient(req)
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return { user: null, client, error: error?.message ?? 'Unauthorized' }
  return { user, client, error: null }
}
