import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'
import { rejectCrossSite } from '@/common/api/same-origin'

/**
 * Thin proxy to `POST /accounts/verifications` — 2026-09-23 review.
 *
 * The route existed on the API since #171 (RF-002) with no way to reach it:
 * the email carried no link (`resend-mail.sender.ts` read `data.url`, the
 * service sent `data.token`) and this proxy did not exist. Public, like sign-up
 * and sign-in: verifying an address happens before anyone is signed in.
 */
export async function POST(request: Request): Promise<Response> {
  const refused = rejectCrossSite(request, { jsonBody: true })
  if (refused) {
    return refused
  }

  return relay(
    apiFetch('/api/accounts/verifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: await request.text(),
      forwardedIp: forwardedIpFrom(request),
    }),
  )
}
