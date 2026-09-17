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
export async function relay(apiResponse: Response): Promise<Response> {
  const body = await apiResponse.text()
  const headers = new Headers()

  const contentType = apiResponse.headers.get('content-type')
  if (contentType) {
    headers.set('content-type', contentType)
  }
  for (const cookie of apiResponse.headers.getSetCookie()) {
    headers.append('set-cookie', cookie)
  }

  return new Response(body, { status: apiResponse.status, headers })
}
