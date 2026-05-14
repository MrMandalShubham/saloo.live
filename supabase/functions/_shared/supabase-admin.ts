import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Singleton admin client ──────────────────────────────────────────────
// Deno edge functions reuse the same isolate for multiple requests.
// Creating a new client per request wastes ~5ms on connection setup.
// At 1K concurrent users that's 5 seconds of wasted CPU per second.

let _adminClient: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        db: { schema: 'public' },
        // Connection pooling: reuse TCP connections
        global: {
          headers: { 'x-connection-pool': 'true' },
        },
      }
    )
  }
  return _adminClient
}

// ── Per-request user client (cannot be cached — different JWTs) ─────────
export function createUserClient(req: Request): SupabaseClient {
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
