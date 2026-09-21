import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'
import { rejectCrossSite } from '@/common/api/same-origin'

/**
 * Thin proxy to `POST /accounts/verifications/resends` — issue #171.
 *
 * No body: the API takes the address from the session, because this screen
 * never learns the account's own email (item 17 of the security checklist).
 */
export async function POST(request: Request): Promise<Response> {
  const refused = rejectCrossSite(request, { jsonBody: false })
  if (refused) {
    return refused
  }

  const cookie = request.headers.get('cookie')

  return relay(
    apiFetch('/api/accounts/verifications/resends', {
      method: 'POST',
      headers: cookie ? { cookie } : undefined,
      forwardedIp: forwardedIpFrom(request),
    }),
  )
}
