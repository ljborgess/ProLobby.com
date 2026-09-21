import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'
import { rejectCrossSite } from '@/common/api/same-origin'

/**
 * Thin proxy to `POST /accounts/discord-links` — starts the Discord link, #149.
 *
 * Unlike sign-in this is an authenticated call, so the browser's session cookie
 * has to travel to the API: this route forwards it and relays the answer, and
 * still never reads the cookie itself.
 */
export async function POST(request: Request): Promise<Response> {
  const refused = rejectCrossSite(request, { jsonBody: false })
  if (refused) {
    return refused
  }

  const cookie = request.headers.get('cookie')

  return relay(
    apiFetch('/api/accounts/discord-links', {
      method: 'POST',
      headers: cookie ? { cookie } : undefined,
      forwardedIp: forwardedIpFrom(request),
    }),
  )
}
