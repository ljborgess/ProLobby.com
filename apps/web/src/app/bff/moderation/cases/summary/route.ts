import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'

/** Thin proxy to the moderation panel's open-case counts — #309. */
export async function GET(request: Request): Promise<Response> {
  const cookie = request.headers.get('cookie')
  return relay(
    apiFetch('/api/moderation/cases/summary', {
      headers: cookie ? { cookie } : {},
      cache: 'no-store',
      forwardedIp: forwardedIpFrom(request),
    }),
  )
}
