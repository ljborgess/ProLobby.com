import 'server-only'

/**
 * The real client address to hand the API, read from the header Cloudflare
 * sets on every request that reaches this server — ADR-009.
 *
 * **Only in production.** Cloudflare overwrites `CF-Connecting-IP` at the
 * edge, so a client cannot choose its own value; with nothing in front, the
 * header is just another field the caller controls. Forwarding it anywhere
 * else would let a request pick the bucket it is counted in, and the API
 * trusts whatever arrives here (`CfConnectingIpThrottlerGuard`) — the two
 * layers together are what makes the rate limit mean anything.
 *
 * Absent outside production is the correct answer, not a gap: the API then
 * falls back to the socket address, which in local dev is the real one.
 */
export function forwardedIpFrom(request: Request): string | undefined {
  if (process.env.NODE_ENV !== 'production') {
    return undefined
  }

  return request.headers.get('cf-connecting-ip') ?? undefined
}
