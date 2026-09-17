import type { NextConfig } from 'next'

/**
 * Security headers — item 18 of the security checklist.
 *
 * apps/api deliberately leaves CSP off (see its app.module.ts): it serves
 * JSON, not HTML, and the page policy belongs here. This is that policy.
 *
 * Baseline only: no cross-origin `connect-src` yet, because apps/web has no
 * page calling apps/api across origins. The login screen (issue #87) will
 * need one — add it there, calibrated against the real API origin, not
 * guessed here.
 */
const SECURITY_HEADERS = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
]

// HSTS only makes sense over HTTPS, and only in production — in dev it would
// tell the browser to remember "always HTTPS" for localhost, which then
// breaks the next `pnpm dev` run on plain http.
if (process.env.NODE_ENV === 'production') {
  SECURITY_HEADERS.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains',
  })
}

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }]
  },
}

export default nextConfig
