import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'
import { rejectCrossSite } from '@/common/api/same-origin'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Thin proxy to a moderator closing a case — #309. The API validates outcome, reason and note. */
export async function POST(
  request: Request,
  context: RouteContext<'/bff/moderation/cases/[caseId]/closures'>,
): Promise<Response> {
  const refused = rejectCrossSite(request, { jsonBody: true })
  if (refused) {
    return refused
  }

  const { caseId } = await context.params
  if (!UUID.test(caseId)) {
    return Response.json({ message: 'case_not_found' }, { status: 404 })
  }

  const cookie = request.headers.get('cookie')
  return relay(
    apiFetch(`/api/moderation/cases/${caseId}/closures`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: await request.text(),
      forwardedIp: forwardedIpFrom(request),
    }),
  )
}
