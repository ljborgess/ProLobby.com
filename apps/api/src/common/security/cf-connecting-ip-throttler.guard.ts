import { Injectable } from '@nestjs/common'
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
  protected async getTracker(req: Record<string, any>): Promise<string> {
    if (process.env.NODE_ENV === 'production') {
      const forwarded = req.headers['cf-connecting-ip']
      if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded
      }
    }

    return req.ip
  }
}
