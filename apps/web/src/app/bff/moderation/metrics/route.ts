import { apiFetch } from '@/common/api/client'
import { readInit } from '@/common/api/moderation-proxy'
import { relay } from '@/common/api/proxy-response'

/** Thin proxy to the beta and success numbers — #312. */
export function GET(request: Request): Promise<Response> {
  return relay(apiFetch('/api/moderation/metrics', readInit(request)))
}
