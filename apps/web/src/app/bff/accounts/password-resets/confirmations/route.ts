import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'
import { rejectCrossSite } from '@/common/api/same-origin'

/**
 * Thin proxy to `POST /accounts/password-resets/confirmations` (RF-024) —
 * 2026-09-23 review. Public: setting the new password from the emailed link
 * happens before anyone is signed in — the token itself is the credential.
 */
export async function POST(request: Request): Promise<Response> {
  const refused = rejectCrossSite(request, { jsonBody: true })
  if (refused) {
    return refused
  }

  return relay(
    apiFetch('/api/accounts/password-resets/confirmations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: await request.text(),
      forwardedIp: forwardedIpFrom(request),
    }),
  )
}
