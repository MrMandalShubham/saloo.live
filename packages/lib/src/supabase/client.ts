import { createClient } from '@supabase/supabase-js'
import type { Database } from '@saloo/types'

const supabaseUrl = (
  typeof process !== 'undefined'
    ? process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? process.env['EXPO_PUBLIC_SUPABASE_URL']
    : undefined
) ?? ''

const supabaseAnonKey = (
  typeof process !== 'undefined'
    ? process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY']
    : undefined
) ?? ''

// Browser / React Native client (uses anon key, respects RLS)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Server client factory (for Next.js server components / Edge Functions)
export function createServerClient(url: string, serviceRoleKey: string) {
  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
