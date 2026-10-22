import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'
import { rejectCrossSite } from '@/common/api/same-origin'

/**
 * Thin proxy for the lobby's answers under `/queue` (#247, #248, #249),
 * the steps of screen #252. Same guard as every other write.
 */
export async function lobbyAction(
  request: Request,
  path: string,
  method: 'PUT',
  withBody: boolean,
): Promise<Response> {
  const refused = rejectCrossSite(request, { jsonBody: withBody })
  if (refused) {
    return refused
  }
  const cookie = request.headers.get('cookie')
  return relay(
    apiFetch(`/api/queue/${path}`, {
      method,
      headers: {
        ...(withBody ? { 'content-type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
      },
      body: withBody ? await request.text() : undefined,
      cache: 'no-store',
      forwardedIp: forwardedIpFrom(request),
    }),
  )
}
