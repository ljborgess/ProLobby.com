import 'server-only'

/**
 * Refuses a state-changing `/bff` call that did not come from this site — audit
 * of 2026-09-21.
 *
 * `SameSite: lax` (ADR-007, item 9b of the security checklist) keeps a forged
 * request from *carrying* the session cookie. It does nothing for sign-in and
 * sign-up, which need no cookie: a page anywhere could post a `text/plain` form
 * whose body happens to be valid JSON, and the proxy forwarded it as JSON. That
 * signed the visitor into the attacker's account (whose Discord link then became
 * the victim's, exclusively), and let sign-up borrow every visitor's IP past the
 * per-IP limit.
 *
 * Two checks, both needed:
 *
 * - `Sec-Fetch-Site` is set by the browser and cannot be forged by a page. Only
 *   `same-origin` and `none` (typed or bookmarked) pass. Absent means no
 *   browser — a server or a script — which is not the forgery this guards.
 * - A JSON body must say so. An HTML form cannot send `application/json`, and a
 *   cross-site `fetch` with it triggers a CORS preflight these routes never
 *   approve — so this alone already closes the form-based variant.
 *
 * `/bff/discord/callback` must not use this: it is a top-level navigation back
 * from discord.com, cross-site by definition, and the single-use `state` bound to
 * the session is what protects it.
 */
export function rejectCrossSite(
  request: Request,
  { jsonBody }: { jsonBody: boolean },
): Response | undefined {
  const site = request.headers.get('sec-fetch-site')

  if (site !== null && site !== 'same-origin' && site !== 'none') {
    return forbidden()
  }

  if (jsonBody && !request.headers.get('content-type')?.startsWith('application/json')) {
    return forbidden()
  }

  return undefined
}

function forbidden(): Response {
  return Response.json(
    { message: 'cross_site_request' },
    { status: 403, headers: { 'cache-control': 'private, no-store' } },
  )
}
