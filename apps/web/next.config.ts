import type { NextConfig } from 'next'

/**
 * Security headers — item 18 of the security checklist.
 *
 * apps/api deliberately leaves CSP off (see its app.module.ts): it serves
 * JSON, not HTML, and the page policy belongs here.
 *
 * The CSP itself is **not** in this list: it needs a nonce that changes on
 * every response, and what `headers()` returns is static. It is set in
 * `src/middleware.ts`, which also explains what the static version broke.
 * Everything below is the same on every response, so it stays here.
 */
const SECURITY_HEADERS = [
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
