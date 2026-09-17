import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'

/**
 * Thin proxy to `POST /accounts` (sign-up, RF-019) — issue #87.
 *
 * The browser never learns the API's address: it calls this same-origin
 * route, and this is what forwards the real client IP for the API's rate
 * limiter (item 11 of the security checklist, issue #99).
 */
export async function POST(request: Request): Promise<Response> {
  const apiResponse = await apiFetch('/accounts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: await request.text(),
    forwardedIp: forwardedIpFrom(request),
  })

  return relay(apiResponse)
}
