import { apiFetch } from './client'
import { forwardedIpFrom } from './forwarded-ip'
import { relay } from './proxy-response'
import { rejectCrossSite } from './same-origin'

/** Same ceiling as the proxy's body buffer; the API caps the file itself. */
const MAX_UPLOAD_BODY_BYTES = 10 * 1024 * 1024

/**
 * A multipart POST relayed to the API: the character print (#195) and the
 * result print (4.1).
 *
 * Multipart, so no JSON check: `Sec-Fetch-Site` refuses a browser on another
 * site, and `SameSite: lax` keeps a cross-site form from carrying the session.
 * The session and the size are checked before the body is read: a request
 * that skips the proxy (a prefetch header does) would otherwise buffer
 * whatever it sends, logged in or not.
 */
export async function relayUpload(request: Request, apiPath: string): Promise<Response> {
  const refused = rejectCrossSite(request, { jsonBody: false })
  if (refused) {
    return refused
  }
  const cookie = request.headers.get('cookie')
  if (!cookie) {
    return Response.json({ message: 'unauthenticated' }, { status: 401 })
  }
  const length = Number(request.headers.get('content-length'))
  if (!Number.isFinite(length) || length <= 0 || length > MAX_UPLOAD_BODY_BYTES) {
    return Response.json({ message: 'payload_too_large' }, { status: 413 })
  }
  const contentType = request.headers.get('content-type')

  return relay(
    apiFetch(apiPath, {
      method: 'POST',
      headers: {
        ...(contentType ? { 'content-type': contentType } : {}),
        cookie,
      },
      body: await request.arrayBuffer(),
      forwardedIp: forwardedIpFrom(request),
    }),
  )
}
