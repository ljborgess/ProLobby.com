import { apiFetch } from '@/common/api/client'
import { isUuid, notFound, readInit } from '@/common/api/moderation-proxy'
import { relay } from '@/common/api/proxy-response'

/** Thin proxy to one player's sheet — #312. */
export async function GET(
  request: Request,
  context: RouteContext<'/bff/moderation/players/[accountId]'>,
): Promise<Response> {
  const { accountId } = await context.params
  if (!isUuid(accountId)) return notFound('player_not_found')
  return relay(apiFetch(`/api/moderation/players/${accountId}`, readInit(request)))
}
