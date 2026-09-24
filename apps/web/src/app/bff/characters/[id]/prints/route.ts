import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'
import { rejectCrossSite } from '@/common/api/same-origin'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  const cookie = request.headers.get('cookie')
  const contentType = request.headers.get('content-type')

  return relay(
    apiFetch(`/api/characters/${id}/prints`, {
      method: 'POST',
      headers: {
        ...(contentType ? { 'content-type': contentType } : {}),
        ...(cookie ? { cookie } : {}),
      },
      body: await request.arrayBuffer(),
      forwardedIp: forwardedIpFrom(request),
    }),
  )
}
