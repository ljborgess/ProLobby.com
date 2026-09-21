import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'
import { rejectCrossSite } from '@/common/api/same-origin'

/**
 * Thin proxy to `POST /sessions` (sign-in, RF-022) — issue #87.
 *
 * `relay()` copies the `Set-Cookie` the API answers with — the `HttpOnly`
 * session cookie (ADR-006) — onto this response untouched. This route never
 * reads or sets the cookie itself; it only carries it between the two
 * servers that are allowed to.
 */
export async function POST(request: Request): Promise<Response> {
  const refused = rejectCrossSite(request, { jsonBody: true })
  if (refused) {
    return refused
  }

  return relay(
    apiFetch('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: await request.text(),
      forwardedIp: forwardedIpFrom(request),
    }),
  )
}
