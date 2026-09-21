import 'server-only'

/**
 * Turns the API's response into the Route Handler's response, unchanged —
 * same status, same body, same cookies.
 *
 * `Set-Cookie` needs its own copy: `fetch`'s `Headers` folds repeated
 * headers into one comma-joined string except for this one, which is why
 * `getSetCookie()` exists — a plain `headers.get('set-cookie')` would mangle
 * two cookies (the session and, say, a future CSRF token) into a string
 * neither browser nor API meant.
 */
export async function relay(pending: Promise<Response>): Promise<Response> {
  let apiResponse: Response
  try {
    apiResponse = await pending
  } catch {
    // The API is down or unreachable. Without this the handler threw, Next
    // answered a bare 500, and the sign-in form told the person their password
    // was wrong (audit of 2026-09-21). 502 and not 503: sign-up reads 503 as
    // "sign-up paused" and would show success.
    return Response.json(
      { message: 'api_unavailable' },
      { status: 502, headers: { 'cache-control': 'private, no-store' } },
    )
  }

  const body = await apiResponse.text()
  const headers = new Headers()

  const contentType = apiResponse.headers.get('content-type')
  if (contentType) {
    headers.set('content-type', contentType)
  }
  for (const cookie of apiResponse.headers.getSetCookie()) {
    headers.append('set-cookie', cookie)
  }

  // ADR-009 §8: nothing that carries a session is cacheable, and Cloudflare
  // sits in front of this. Every route relayed here is an authentication
  // exchange — a sign-in answer parked in a shared cache would be served to
  // the next person through it, `Set-Cookie` and all.
  headers.set('cache-control', 'private, no-store')

  return new Response(body, { status: apiResponse.status, headers })
}
