import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'
import { rejectCrossSite } from '@/common/api/same-origin'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Same ceiling as the proxy's body buffer; the API caps the file itself. */
const MAX_PRINT_BODY_BYTES = 10 * 1024 * 1024

/**
 * Thin proxy to `POST /characters/:id/prints` — issue #195, screen #196.
 *
 * Multipart, so no JSON check: `Sec-Fetch-Site` refuses a browser on another
 * site, and `SameSite: lax` keeps a cross-site form from carrying the session.
 * The id is checked before it becomes part of the API path.
 */
export async function POST(
  request: Request,
  context: RouteContext<'/bff/characters/[id]/prints'>,
): Promise<Response> {
  const refused = rejectCrossSite(request, { jsonBody: false })
  if (refused) {
    return refused
  }

  const { id } = await context.params
  if (!UUID.test(id)) {
    return Response.json({ message: 'character_not_found' }, { status: 404 })
  }

  // Checked before the body is read: a request that skips the proxy (a
  // prefetch header does) would otherwise buffer whatever it sends, logged in
  // or not.
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
    apiFetch(`/api/characters/${id}/prints`, {
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
