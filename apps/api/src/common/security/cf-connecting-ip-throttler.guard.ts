import { Injectable, Logger } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'

/**
 * Item 11 of docs/requisitos/08-seguranca-checklist.md / RNF-011 / #99.
 *
 * ADR-009: the API is reachable only through the Cloudflare tunnel, no port
 * published. Cloudflare overwrites `CF-Connecting-IP` on every request that
 * reaches it — a client cannot forge it — which is what makes trusting the
 * header here safe. Outside production (local dev, CI, `docker compose` with
 * a published port) there is no such tunnel, so `req.ip` is the only real
 * client address and the header must not be trusted.
 *
 * `trust proxy` by hop count is the wrong mechanism for this topology: it
 * counts proxies, and a single hidden `cloudflared` container looks the same
 * whether it forwarded one client or the whole internet.
 */
@Injectable()
export class CfConnectingIpThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CfConnectingIpThrottlerGuard.name)

  /** Throttles the log itself: the condition repeats on every request. */
  private lastMissingHeaderLogAt = 0

  protected async getTracker(req: ThrottledRequest): Promise<string> {
    const clientIp = req.ip ?? 'unknown'

    if (process.env.NODE_ENV !== 'production') {
      return clientIp
    }

    const forwarded = req.headers['cf-connecting-ip']
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded
    }

    // Falling back to `req.ip` here is not "slightly less precise": behind the
    // tunnel every request arrives from the same local address, so the tracker
    // collapses into ONE bucket for the whole platform. `LOGIN_THROTTLE`
    // (5/min) would then mean five sign-in attempts per minute for every user
    // combined — a self-inflicted outage, not a weaker defence.
    //
    // It is not fail-closed on purpose: rejecting would also reject the
    // container's own health probe, which never carries the header, and trade
    // a degraded limit for a service that will not start. The log line is what
    // turns a silent collapse into something operations can see.
    this.warnAboutMissingHeader()

    return clientIp
  }

  private warnAboutMissingHeader(): void {
    const now = Date.now()

    if (now - this.lastMissingHeaderLogAt < MISSING_HEADER_LOG_INTERVAL_MS) {
      return
    }

    this.lastMissingHeaderLogAt = now
    this.logger.error(
      'CF-Connecting-IP absent in production: the rate limit is now GLOBAL, not per-IP. ' +
        'Either the request did not pass through Cloudflare, or the tunnel rule changed (ADR-009).',
    )
  }
}

/** One line a minute is enough to notice; per request would flood the log. */
const MISSING_HEADER_LOG_INTERVAL_MS = 60_000

/**
 * What the guard actually reads off the request — narrower than Express's
 * `Request`, so no `any` is needed and the two fields in use are explicit.
 */
interface ThrottledRequest {
  ip?: string
  headers: Record<string, string | string[] | undefined>
}
