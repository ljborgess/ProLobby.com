import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'
import { rejectCrossSite } from '@/common/api/same-origin'

/**
 * Thin proxy to `POST /accounts/me/two-factor/setup` — the panel's second factor, #311. `relay()`
 * carries the upgraded session cookie back untouched.
 */
export async function POST(request: Request): Promise<Response> {
  const refused = rejectCrossSite(request, { jsonBody: true })
  if (refused) {
    return refused
  }
  const cookie = request.headers.get('cookie')
  return relay(
    apiFetch('/api/accounts/me/two-factor/setup', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(cookie ? { cookie } : {}),
      },
      body: await request.text(),
      cache: 'no-store',
      forwardedIp: forwardedIpFrom(request),
    }),
  )
}
