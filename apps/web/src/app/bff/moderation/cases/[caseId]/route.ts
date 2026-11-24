import { apiFetch } from '@/common/api/client'
import { isUuid, notFound, readInit } from '@/common/api/moderation-proxy'
import { relay } from '@/common/api/proxy-response'

/** Thin proxy to one case of the panel — #307. */
export async function GET(
  request: Request,
  context: RouteContext<'/bff/moderation/cases/[caseId]'>,
): Promise<Response> {
  const { caseId } = await context.params
  if (!isUuid(caseId)) return notFound('case_not_found')
  return relay(apiFetch(`/api/moderation/cases/${caseId}`, readInit(request)))
}
