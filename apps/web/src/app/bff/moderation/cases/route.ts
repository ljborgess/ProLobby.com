import { apiFetch } from '@/common/api/client'
import { forwardedIpFrom } from '@/common/api/forwarded-ip'
import { relay } from '@/common/api/proxy-response'
import { CASE_TYPES, SECTION_KEYS } from '@/modules/moderation/cases'

/**
 * Thin proxy to a section's open cases — #309. Only the two filters the panel
 * uses cross, each checked against its closed set: nothing else of the
 * browser's query string reaches the API.
 */
export async function GET(request: Request): Promise<Response> {
  const incoming = new URL(request.url).searchParams
  const section = incoming.get('section')
  const type = incoming.get('type')

  if (section && !(SECTION_KEYS as readonly string[]).includes(section)) {
    return Response.json({ message: 'invalid_section' }, { status: 400 })
  }
  if (type && !(CASE_TYPES as readonly string[]).includes(type)) {
    return Response.json({ message: 'invalid_type' }, { status: 400 })
  }

  const query = new URLSearchParams()
  if (section) query.set('section', section)
  if (type) query.set('type', type)
  const suffix = query.size > 0 ? `?${query}` : ''

  const cookie = request.headers.get('cookie')
  return relay(
    apiFetch(`/api/moderation/cases${suffix}`, {
      headers: cookie ? { cookie } : {},
      cache: 'no-store',
      forwardedIp: forwardedIpFrom(request),
    }),
  )
}
