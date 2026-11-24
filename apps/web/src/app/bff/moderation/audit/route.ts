import { apiFetch } from '@/common/api/client'
import { queryOf, readInit } from '@/common/api/moderation-proxy'
import { relay } from '@/common/api/proxy-response'

/** Thin proxy to the audit trail, filters and `before` as they came — #312. */
export function GET(request: Request): Promise<Response> {
  return relay(apiFetch('/api/moderation/audit' + queryOf(request), readInit(request)))
}
