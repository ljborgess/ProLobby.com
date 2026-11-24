import { apiFetch } from '@/common/api/client'
import { crossSite, isUuid, notFound, writeInit } from '@/common/api/moderation-proxy'
import { relay } from '@/common/api/proxy-response'

/** Thin proxy to a moderator closing a case — #306, #307. */
export async function POST(
  request: Request,
  context: RouteContext<'/bff/moderation/cases/[caseId]/closures'>,
): Promise<Response> {
  const refused = crossSite(request)
  if (refused) return refused
  const { caseId } = await context.params
  if (!isUuid(caseId)) return notFound('case_not_found')
  return relay(apiFetch(`/api/moderation/cases/${caseId}/closures`, await writeInit(request)))
}
