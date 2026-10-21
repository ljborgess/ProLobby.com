import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'
import { rejectCrossSite } from '@/common/api/same-origin'
import { lobbyAction } from '../lobby-action'

/** Same ceiling as the proxy's body buffer; the API caps the file itself. */
const MAX_PRINT_BODY_BYTES = 10 * 1024 * 1024

/**
 * `POST /queue/report` — 4.1: the result print and the score. Multipart, so
 * the same guard as the character print: `Sec-Fetch-Site`, then the session
 * and the size before the body is read.
 */
export async function POST(request: Request): Promise<Response> {
  const refused = rejectCrossSite(request, { jsonBody: false })
  if (refused) {
    return refused
  }
  const cookie = request.headers.get('cookie')
  if (!cookie) {
    return Response.json({ message: 'unauthenticated' }, { status: 401 })
  }
  const length = Number(request.headers.get('content-length'))
  if (!Number.isFinite(length) || length <= 0 || length > MAX_PRINT_BODY_BYTES) {
    return Response.json({ message: 'payload_too_large' }, { status: 413 })
  }
  const contentType = request.headers.get('content-type')

  return relay(
    apiFetch('/api/queue/report', {
      method: 'POST',
      headers: {
        ...(contentType ? { 'content-type': contentType } : {}),
        cookie,
      },
      body: await request.arrayBuffer(),
      forwardedIp: forwardedIpFrom(request),
    }),
  )
}

/** `PUT /queue/report` — fixes the typed score while the other side has not reported. */
export function PUT(request: Request): Promise<Response> {
  return lobbyAction(request, 'report', 'PUT', true)
}
