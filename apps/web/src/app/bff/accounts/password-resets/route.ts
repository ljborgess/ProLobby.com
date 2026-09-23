import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'
import { rejectCrossSite } from '@/common/api/same-origin'

/**
 * Thin proxy to `POST /accounts/password-resets` (RF-024) — 2026-09-23
 * review. Public: asking for a reset link happens before anyone is signed in,
 * and the API answers the same shape for a known and an unknown address
 * either way (RF-070).
 */
export async function POST(request: Request): Promise<Response> {
  const refused = rejectCrossSite(request, { jsonBody: true })
  if (refused) {
    return refused
  }

  return relay(
    apiFetch('/api/accounts/password-resets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: await request.text(),
      forwardedIp: forwardedIpFrom(request),
    }),
  )
}
