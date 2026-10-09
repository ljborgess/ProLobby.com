import express, { Express, NextFunction, Request, Response } from 'express'
import {
  WEBHOOK_MAX_SKEW_MS,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  isKnownPlatformEventType,
  isWebhookTimestampFresh,
  platformEventSchema,
  readWebhookSecret,
  type PlatformEvent,
  verifyWebhookSignature,
} from '@prolobby/types'

import { SlidingWindowLimiter, WEBHOOK_BODY_LIMIT, type Clock } from './rate-limit'

type RequestWithRawBody = Request & { rawBody?: Buffer }

export type WebhookServerOptions = {
  secret: string
  clock?: Clock
  limiter?: SlidingWindowLimiter
  /**
   * Whether the Discord gateway is currently connected — issue #168. Defaults
   * to always-ready so every existing test and caller keeps working; the real
   * entrypoint (index.ts) passes `() => client.isReady()`.
   */
  isReady?: () => boolean
  /**
   * What to do with an accepted event (#226 is the first). Throwing answers
   * 503, which the API treats as "try later" and retries on its own backoff.
   */
  onEvent?: (event: PlatformEvent) => Promise<void>
}

/** How many delivered event ids are remembered to drop a retried duplicate. */
const SEEN_EVENTS = 500

/**
 * Receives platform events (RF-058).
 *
 * `/events` is never published by the Cloudflare tunnel and has no `ports:`
 * in production (ADR-009). HMAC is still mandatory: topology is the first
 * barrier, not the only one. Kick, ban and channel creation must not depend
 * on nobody having forwarded a path.
 */
export function createWebhookServer(options: WebhookServerOptions): Express {
  const clock: Clock = options.clock ?? { now: () => new Date() }
  const limiter = options.limiter ?? new SlidingWindowLimiter(clock)
  const isReady = options.isReady ?? (() => true)
  // The API retries when it does not see our 202 in time; the event id is
  // stable across attempts, so a retry of something already handled is
  // acknowledged without acting twice (two Discord posts for one case).
  // ponytail: in memory, so a restart between an attempt and its retry can
  // still repeat once; a persisted set if that ever shows up.
  const seen = new Set<string>()

  const app = express()

  // No auth and no rate limit: Compose's own healthcheck calls this on the
  // loopback address, and it reports a fact about this process, not business
  // data. 503 while the gateway is down is what makes `docker compose` (and
  // RF-060, which needs the bot really connected) able to tell.
  app.get('/health', (_req: Request, res: Response) => {
    const discordReady = isReady()
    res.status(discordReady ? 200 : 503).json({ discordReady })
  })

  app.use(
    express.json({
      limit: WEBHOOK_BODY_LIMIT,
      verify: (req: RequestWithRawBody, _res, buf) => {
        req.rawBody = buf
      },
    }),
  )

  app.post('/events', async (req: RequestWithRawBody, res: Response) => {
    const signature = req.header(WEBHOOK_SIGNATURE_HEADER)
    const signedAt = req.header(WEBHOOK_TIMESTAMP_HEADER)
    const rawBody = req.rawBody ?? Buffer.from('')

    if (!verifyWebhookSignature(options.secret, signedAt, rawBody, signature)) {
      res.status(401).json({ error: 'invalid_signature' })
      return
    }

    // The window belongs to the signature, not to the event. A delivery the
    // API recovered from its own table hours after a restart is legitimate
    // and gets signed fresh; a request captured off the wire stops working
    // five minutes later. `signedAt` is inside the signed material, so it
    // cannot be moved forward without the secret.
    if (!isWebhookTimestampFresh(signedAt ?? '', clock.now(), WEBHOOK_MAX_SKEW_MS)) {
      res.status(401).json({ error: 'expired_timestamp' })
      return
    }

    // After auth, not before: an unauthenticated caller must not learn the
    // gateway's state. A 202 with the gateway down is how the API's own retry
    // (RF-058) got fooled into marking a kick/ban/etc "delivered" while
    // nothing could execute it (2026-09-23 review) — 503 puts it back in the
    // API's retry loop instead of silently dropping the event.
    if (!isReady()) {
      res.status(503).json({ error: 'discord_not_ready' })
      return
    }

    // After HMAC: unsigned floods must not spend the global budget. 429 is for
    // a retry loop in the API (issue #94), not for anyone who can reach the port.
    if (!limiter.allow()) {
      res.status(429).json({ error: 'rate_limited' })
      return
    }

    const type = typeof req.body?.type === 'string' ? req.body.type : undefined
    if (type !== undefined && !isKnownPlatformEventType(type)) {
      res.status(400).json({ error: 'unknown_event_type', type })
      return
    }

    const parsed = platformEventSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() })
      return
    }

    if (options.onEvent && !seen.has(parsed.data.id)) {
      try {
        await options.onEvent(parsed.data)
      } catch {
        res.status(503).json({ error: 'handler_failed' })
        return
      }
      seen.add(parsed.data.id)
      if (seen.size > SEEN_EVENTS) seen.delete(seen.values().next().value!)
    }
    res.status(202).json({ received: true })
  })

  // A body-parser failure never reaches the route, so it is answered here or
  // Express's own handler takes over — which replies with an HTML page and,
  // outside production, the stack trace in the body (item 15).
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (isPayloadTooLarge(err)) {
      res.status(413).json({ error: 'payload_too_large' })
      return
    }
    if (isMalformedJson(err)) {
      res.status(400).json({ error: 'invalid_json' })
      return
    }
    next(err)
  })

  return app
}

function isPayloadTooLarge(err: unknown): boolean {
  const typed = asBodyParserError(err)
  return typed?.status === 413 || typed?.type === 'entity.too.large'
}

function isMalformedJson(err: unknown): boolean {
  const typed = asBodyParserError(err)
  return typed?.type === 'entity.parse.failed' || err instanceof SyntaxError
}

function asBodyParserError(err: unknown): { status?: number; type?: string } | null {
  if (typeof err !== 'object' || err === null) {
    return null
  }
  return err as { status?: number; type?: string }
}

export { readWebhookSecret }
