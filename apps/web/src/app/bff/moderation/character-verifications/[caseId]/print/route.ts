import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/**
 * The print a moderator judges — #198. Bytes, not text, so not `relay()`.
 * Only an image type from the API is passed on, and never cached: the API
 * already refused anyone who is not a moderator.
 */
export async function GET(
  request: Request,
  context: RouteContext<'/bff/moderation/character-verifications/[caseId]/print'>,
): Promise<Response> {
  const { caseId } = await context.params
  if (!UUID.test(caseId)) {
    return new Response(null, { status: 404 })
  }

  const cookie = request.headers.get('cookie')
  let upstream: Response
  try {
    upstream = await apiFetch(`/api/moderation/character-verifications/${caseId}/print`, {
      headers: cookie ? { cookie } : undefined,
      cache: 'no-store',
      forwardedIp: forwardedIpFrom(request),
    })
  } catch {
    return new Response(null, { status: 502 })
  }

  const type = upstream.headers.get('content-type')?.split(';')[0] ?? ''
  if (!upstream.ok || !IMAGE_TYPES.includes(type)) {
    return new Response(null, { status: upstream.ok ? 502 : upstream.status })
  }

  return new Response(await upstream.arrayBuffer(), {
    headers: {
      'content-type': type,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  })
}
