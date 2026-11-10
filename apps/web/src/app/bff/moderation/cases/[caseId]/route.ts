import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Thin proxy to one case's detail — #309. */
export async function GET(
  request: Request,
  context: RouteContext<'/bff/moderation/cases/[caseId]'>,
): Promise<Response> {
  const { caseId } = await context.params
  if (!UUID.test(caseId)) {
    return Response.json({ message: 'case_not_found' }, { status: 404 })
  }

  const cookie = request.headers.get('cookie')
  return relay(
    apiFetch(`/api/moderation/cases/${caseId}`, {
      headers: cookie ? { cookie } : {},
      cache: 'no-store',
      forwardedIp: forwardedIpFrom(request),
    }),
  )
}
