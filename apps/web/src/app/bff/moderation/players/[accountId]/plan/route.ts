import { apiFetch } from '@/common/api/client'
import { crossSite, isUuid, notFound, writeInit } from '@/common/api/moderation-proxy'
import { relay } from '@/common/api/proxy-response'

/** Thin proxy to an admin setting a player's plan — #313. The API answers 403 `admin_only` to anyone else. */
export async function POST(
  request: Request,
  context: RouteContext<'/bff/moderation/players/[accountId]/plan'>,
): Promise<Response> {
  const refused = crossSite(request)
  if (refused) return refused
  const { accountId } = await context.params
  if (!isUuid(accountId)) return notFound('player_not_found')
  return relay(apiFetch(`/api/moderation/players/${accountId}/plan`, await writeInit(request)))
}
