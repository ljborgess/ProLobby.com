import { NextResponse, type NextRequest } from 'next/server'

/**
 * Content-Security-Policy with a per-request nonce — item 18 of the security
 * checklist.
 *
 * It lives here and not in `next.config.ts` because a nonce has to change on
 * every response, and `headers()` in the config is static. The previous
 * static policy (`script-src 'self'`, no nonce) was not merely weaker — it
 * **broke the application**: the App Router emits two inline scripts carrying
 * the RSC payload, the browser refused both, and every page load ended in
 * React error #412 with the page never hydrating. A form that never hydrates
 * submits natively, which is how a password reached the query string.
 *
 * Next.js reads the nonce from the request header it receives and stamps it
 * onto the scripts it generates, so the policy and the markup cannot drift.
 *
 * `strict-dynamic` lets the nonced bootstrap load the chunks it needs without
 * naming each one; browsers that honour it ignore the `'self'` fallback, and
 * older ones fall back to it. The chunk URLs change every build, so the
 * alternative is a policy nobody can keep correct.
 *
 * File and export are `proxy`, not `middleware` — Next 16 renamed the
 * convention (issue #157). Behaviour is the same.
 */
export function proxy(request: NextRequest): NextResponse {
  const nonce = crypto.randomUUID()

  const csp = [
    "default-src 'self'",
    // 'unsafe-eval' only under `next dev`: React rebuilds server callstacks
    // with eval() there and logs an error on every page without it. Production
    // React never calls eval(), and the e2e suite runs against `next start`.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''
    }`,
    // Tailwind injects style attributes at runtime; there is no nonce path
    // for those, and a stylesheet cannot exfiltrate the way a script can.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    // Self-hosted only: the landing's background clip ships from public/, and
    // no third-party player is allowed to load media into the page.
    "media-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    // Keeps a native submit — the one that happens before hydration — from
    // being retargeted at another origin.
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('content-security-policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('content-security-policy', csp)

  return response
}

export const config = {
  matcher: [
    /*
     * Every page, and nothing served straight off disk: static chunks, images
     * and the favicon carry no inline script, so a policy on them costs a
     * proxy invocation and buys nothing.
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
