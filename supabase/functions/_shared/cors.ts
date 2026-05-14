export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  return null
}

/**
 * Standard JSON response.
 * @param cacheSec - Optional Cache-Control max-age in seconds for GET endpoints.
 *                   Use for read-heavy, low-churn data (nearby shops, shop profiles).
 *                   Never cache user-specific or mutation responses.
 */
export function json<T>(data: T, status = 200, cacheSec = 0): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  }

  if (cacheSec > 0) {
    headers['Cache-Control'] = `public, s-maxage=${cacheSec}, stale-while-revalidate=${cacheSec * 2}`
    headers['CDN-Cache-Control'] = `max-age=${cacheSec}`
  } else {
    headers['Cache-Control'] = 'no-store'
  }

  return new Response(JSON.stringify(data), { status, headers })
}

export function error(message: string, status = 400, code?: string): Response {
  return new Response(JSON.stringify({ data: null, error: { message, code } }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
