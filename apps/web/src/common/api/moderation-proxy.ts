import 'server-only'

import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { rejectCrossSite } from '@/common/api/same-origin'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (value: string): boolean => UUID.test(value)

/** The query string of the browser's call, passed on as it came: the API validates it. */
export const queryOf = (request: Request): string => new URL(request.url).search

/**
 * What a `/bff/moderation/*` route sends to the API: the session cookie and the
 * forwarded IP, never cached. The route itself calls `apiFetch('/api/...')`
 * with a literal path, so the API contract test can see it. The API decides
 * who gets in (role, second factor); the web only carries the call.
 */
export function readInit(request: Request) {
  const cookie = request.headers.get('cookie')
  return {
    headers: cookie ? { cookie } : undefined,
    cache: 'no-store' as const,
    forwardedIp: forwardedIpFrom(request),
  }
}

/** Same, for a POST: a cross-site call is refused before anything is sent. */
export async function writeInit(request: Request) {
  const cookie = request.headers.get('cookie')
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: await request.text(),
    forwardedIp: forwardedIpFrom(request),
  }
}

export const crossSite = (request: Request): Response | undefined =>
  rejectCrossSite(request, { jsonBody: true })

export const notFound = (message: string): Response => Response.json({ message }, { status: 404 })
