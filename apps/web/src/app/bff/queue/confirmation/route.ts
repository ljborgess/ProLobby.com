import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'
import { rejectCrossSite } from '@/common/api/same-origin'

/** Thin proxy to `PUT /queue/confirmation` — issue #232, the 30 s answer. */
export async function PUT(request: Request): Promise<Response> {
  const refused = rejectCrossSite(request, { jsonBody: true })
  if (refused) {
    return refused
  }

  const cookie = request.headers.get('cookie')
  return relay(
    apiFetch('/api/queue/confirmation', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: await request.text(),
      cache: 'no-store',
      forwardedIp: forwardedIpFrom(request),
    }),
  )
}
