import { apiFetch } from '@/common/api/client'
import { queryOf, readInit } from '@/common/api/moderation-proxy'
import { relay } from '@/common/api/proxy-response'

/** Thin proxy to the panel's case list, `?section=` and `?type=` as they came — #307. */
export function GET(request: Request): Promise<Response> {
  return relay(apiFetch('/api/moderation/cases' + queryOf(request), readInit(request)))
}
