import 'server-only'

/**
 * The one place `apps/web` knows the API's address — issue #87 (ADR-009).
 *
 * In production, web and API sit behind the same Cloudflare hostname
 * (`prolobby.com.br`), reached through different paths — same origin, no
 * CORS. In development there is no shared edge, so this falls back to the
 * API dev server directly.
 */
const API_BASE_URL = process.env.API_URL ?? 'http://127.0.0.1:3001'

export interface ApiFetchOptions extends RequestInit {
  /**
   * The real client IP, forwarded as `CF-Connecting-IP` — the header the API
   * trusts for rate limiting behind the tunnel (issue #99). Only meaningful
   * when this call originates from a Next.js server process acting on a
   * browser's behalf (a Server Component, Route Handler or Server Action):
   * that outbound fetch is a *new* request, and does not carry the original
   * browser's IP unless it is explicitly copied over here.
   */
  forwardedIp?: string
}

/**
 * The only function in `apps/web` that calls `apps/api` — nothing else
 * constructs a URL to it, so the address lives in exactly one place.
 *
 * Server-only (see the import at the top): bundling this into client
 * JavaScript would ship `API_BASE_URL`'s dev-mode fallback to the browser,
 * and more importantly would make it possible to call the API bypassing
 * whatever this function is later asked to enforce (forwarding, retries).
 */
export function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { forwardedIp, headers, ...init } = options

  const requestHeaders = new Headers(headers)
  if (forwardedIp) {
    requestHeaders.set('CF-Connecting-IP', forwardedIp)
  }

  return fetch(`${API_BASE_URL}${path}`, { ...init, headers: requestHeaders })
}
