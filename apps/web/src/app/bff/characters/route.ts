import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'
import { rejectCrossSite } from '@/common/api/same-origin'

/** Thin proxy to `POST /characters` — issue #194, screen #196. */
export async function POST(request: Request): Promise<Response> {
  const refused = rejectCrossSite(request, { jsonBody: true })
  if (refused) {
    return refused
  }

  const cookie = request.headers.get('cookie')

  return relay(
    apiFetch('/api/characters', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: await request.text(),
      forwardedIp: forwardedIpFrom(request),
    }),
  )
}
