import type { ApiResponse } from '@saloo/types'

const url = () => process.env['NEXT_PUBLIC_SUPABASE_URL']!
const anon = () => process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!

/**
 * Calls a Supabase Edge Function and returns a typed ApiResponse.
 * Pass `accessToken` for authenticated endpoints (use user's JWT).
 * Falls back to the anon key for public endpoints.
 */
export async function invoke<T>(
  fn: string,
  body?: unknown,
  accessToken?: string,
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${url()}/functions/v1/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken ?? anon()}`,
        'apikey': anon(),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    const json = await res.json().catch(() => ({ error: 'Invalid JSON response' }))

    if (!res.ok) {
      return {
        data: null,
        error: { message: json?.error ?? json?.message ?? 'Request failed', code: String(res.status) },
      }
    }

    return { data: json as T, error: null }
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Network error' },
    }
  }
}
