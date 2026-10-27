import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'
import { rejectCrossSite } from '@/common/api/same-origin'

/** Thin proxy to `/accounts/me/club` — the declared club, #229. */
function toApi(request: Request, method: 'PUT' | 'DELETE', body?: string) {
  const cookie = request.headers.get('cookie')
  return relay(
    apiFetch('/api/accounts/me/club', {
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

export async function PUT(request: Request): Promise<Response> {
  const refused = rejectCrossSite(request, { jsonBody: true })
  if (refused) {
    return refused
  }
  return toApi(request, 'PUT', await request.text())
}

export async function DELETE(request: Request): Promise<Response> {
  const refused = rejectCrossSite(request, { jsonBody: false })
  if (refused) {
    return refused
  }
  return toApi(request, 'DELETE')
}
