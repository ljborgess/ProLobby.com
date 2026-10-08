import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'
import { rejectCrossSite } from '@/common/api/same-origin'

/** Thin proxy to `/queue` — issues #228 and #232, screen #233. */
function toApi(request: Request, method: 'GET' | 'POST' | 'DELETE', body?: string) {
  const cookie = request.headers.get('cookie')
  return relay(
    apiFetch('/api/queue', {
      method,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
      },
      body,
      cache: 'no-store',
      forwardedIp: forwardedIpFrom(request),
    }),
  )
}

/** The screen polls this while searching, to see the lobby arrive. */
export async function GET(request: Request): Promise<Response> {
  return toApi(request, 'GET')
}

export async function POST(request: Request): Promise<Response> {
  const refused = rejectCrossSite(request, { jsonBody: true })
  if (refused) {
    return refused
  }
  return toApi(request, 'POST', await request.text())
}

export async function DELETE(request: Request): Promise<Response> {
  const refused = rejectCrossSite(request, { jsonBody: false })
  if (refused) {
    return refused
  }
  return toApi(request, 'DELETE')
}
