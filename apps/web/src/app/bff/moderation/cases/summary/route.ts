import { apiFetch } from '@/common/api/client'
import { readInit } from '@/common/api/moderation-proxy'
import { relay } from '@/common/api/proxy-response'

/** Thin proxy to the panel's open cases by section — #307. */
export function GET(request: Request): Promise<Response> {
  return relay(apiFetch('/api/moderation/cases/summary', readInit(request)))
}
