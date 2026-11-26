import { apiFetch } from '@/common/api/client'
import { queryOf, readInit } from '@/common/api/moderation-proxy'
import { relay } from '@/common/api/proxy-response'

/** Thin proxy to the player search, `?q=` as it came — #312. The search itself is audited by the API. */
export function GET(request: Request): Promise<Response> {
  return relay(apiFetch('/api/moderation/players' + queryOf(request), readInit(request)))
}
