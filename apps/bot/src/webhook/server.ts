import express, { Express, NextFunction, Request, Response } from 'express'
import {
  WEBHOOK_MAX_SKEW_MS,
  WEBHOOK_SIGNATURE_HEADER,
  isWebhookTimestampFresh,
  platformEventSchema,
  verifyWebhookSignature,
} from '@prolobby/types'

import { SlidingWindowLimiter, WEBHOOK_BODY_LIMIT, type Clock } from './rate-limit'

type RequestWithRawBody = Request & { rawBody?: Buffer }

export type WebhookServerOptions = {
  secret: string
  clock?: Clock
  limiter?: SlidingWindowLimiter
}

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

  const app = express()
  app.use(
    express.json({
      limit: WEBHOOK_BODY_LIMIT,
      verify: (req: RequestWithRawBody, _res, buf) => {
        req.rawBody = buf
      },
    }),
  )

  app.post('/events', (req: RequestWithRawBody, res: Response) => {
    const signature = req.header(WEBHOOK_SIGNATURE_HEADER)
    const rawBody = req.rawBody ?? Buffer.from('')
    if (!verifyWebhookSignature(options.secret, rawBody, signature)) {
      res.status(401).json({ error: 'invalid_signature' })
      return
    }

    // After HMAC: unsigned floods must not spend the global budget. 429 is for
    // a retry loop in the API (issue #94), not for anyone who can reach the port.
    if (!limiter.allow()) {
      res.status(429).json({ error: 'rate_limited' })
      return
    }

    const parsed = platformEventSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() })
      return
    }

    if (!isWebhookTimestampFresh(parsed.data.occurredAt, clock.now(), WEBHOOK_MAX_SKEW_MS)) {
      res.status(401).json({ error: 'expired_timestamp' })
      return
    }

    // TODO: route to the handler for each of RF-047..062 based on parsed.data.type
    res.status(202).json({ received: true })
  })

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (isPayloadTooLarge(err)) {
      res.status(413).json({ error: 'payload_too_large' })
      return
    }
    next(err)
  })

  return app
}

function isPayloadTooLarge(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) {
    return false
  }
  const typed = err as { status?: number; type?: string }
  return typed.status === 413 || typed.type === 'entity.too.large'
}

export function readWebhookSecret(): string {
  const secret = process.env.WEBHOOK_SECRET
  if (!secret || secret === 'changeme') {
    throw new Error(
      'WEBHOOK_SECRET is required and must not be the placeholder — it authenticates kick/ban/channel commands (items 1 and 6 of the security checklist)',
    )
  }
  return secret
}
