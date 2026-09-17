import 'server-only'

/**
 * The header Cloudflare sets on every request that reaches this server —
 * ADR-009. Absent in local dev (no Cloudflare in front), which is fine: the
 * API's rate limiter falls back to its own default there.
 */
export function forwardedIpFrom(request: Request): string | undefined {
  return request.headers.get('cf-connecting-ip') ?? undefined
}
