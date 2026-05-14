import type { ApiResponse } from '@saloo/types'

const url = () => process.env['NEXT_PUBLIC_SUPABASE_URL']!
const anon = () => process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!

/**
 * In-flight request deduplication.
 * If the same function + body is called multiple times before the first resolves,
 * subsequent calls get the same promise. Prevents duplicate requests from
 * React StrictMode, rapid re-renders, or impatient double-clicks.
 */
const inflight = new Map<string, Promise<ApiResponse<unknown>>>()

function dedupeKey(fn: string, body: unknown): string {
  return `${fn}:${body ? JSON.stringify(body) : ''}`
}

/**
 * Calls a Supabase Edge Function and returns a typed ApiResponse.
 * Pass `accessToken` for authenticated endpoints (use user's JWT).
 * Falls back to the anon key for public endpoints.
 *
 * Features for scale:
 * - Request deduplication (same fn+body in-flight = single network call)
 * - Automatic retry on 503 (edge function cold start) with exponential backoff
 */
export async function invoke<T>(
  fn: string,
  body?: unknown,
  accessToken?: string,
): Promise<ApiResponse<T>> {
  const key = dedupeKey(fn, body)

  // Return existing in-flight request for same fn+body
  const existing = inflight.get(key)
  if (existing) return existing as Promise<ApiResponse<T>>

  const promise = _invoke<T>(fn, body, accessToken)
  inflight.set(key, promise as Promise<ApiResponse<unknown>>)

  try {
    return await promise
  } finally {
    inflight.delete(key)
  }
}

async function _invoke<T>(
  fn: string,
  body: unknown,
  accessToken?: string,
  retries = 2,
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

    // Retry on 503 (cold start) or 429 (rate limit) with backoff
    if ((res.status === 503 || res.status === 429) && retries > 0) {
      const delay = (3 - retries) * 500 + Math.random() * 300
      await new Promise(r => setTimeout(r, delay))
      return _invoke<T>(fn, body, accessToken, retries - 1)
    }

    const json = await res.json().catch(() => ({ error: 'Invalid JSON response' }))

    if (!res.ok) {
      return {
        data: null,
        error: { message: json?.error ?? json?.message ?? 'Request failed', code: String(res.status) },
      }
    }

    return { data: json as T, error: null }
  } catch (err) {
    // Retry on network errors (edge function cold start can cause timeouts)
    if (retries > 0) {
      const delay = (3 - retries) * 500
      await new Promise(r => setTimeout(r, delay))
      return _invoke<T>(fn, body, accessToken, retries - 1)
    }

    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Network error' },
    }
  }
}
