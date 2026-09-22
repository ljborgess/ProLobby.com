import request from 'supertest'
import {
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  sampleLobbyClosedEvent,
  sampleQuotaAlertEvent,
  signWebhookPayload,
} from '@prolobby/types'

import { SlidingWindowLimiter, WEBHOOK_RATE_LIMIT_MAX } from './rate-limit'
import { createWebhookServer } from './server'

const SECRET = 'test-webhook-secret-not-the-placeholder'
const OTHER_SECRET = 'some-other-secret-also-not-a-placeholder'

/**
 * Sends the body as a string, never as a Buffer: superagent re-serialises a
 * Buffer when the content type is json, so the bytes on the wire would stop
 * matching the ones that were signed.
 */
const send = (
  app: ReturnType<typeof createWebhookServer>,
  body: object | string,
  options: { secret?: string; signedAt: string; signedBody?: string },
) => {
  const raw = typeof body === 'string' ? body : JSON.stringify(body)
  const signed = options.signedBody ?? raw

  return request(app)
    .post('/events')
    .set('Content-Type', 'application/json')
    .set(WEBHOOK_TIMESTAMP_HEADER, options.signedAt)
    .set(
      WEBHOOK_SIGNATURE_HEADER,
      signWebhookPayload(options.secret ?? SECRET, options.signedAt, signed),
    )
    .send(raw)
}

describe('webhook server', () => {
  const clock = { now: () => new Date('2026-09-14T12:00:00.000Z') }
  const now = () => clock.now().toISOString()
  const app = createWebhookServer({ secret: SECRET, clock })

  const post = (body: object | string, secret = SECRET) =>
    send(app, body, { secret, signedAt: now() })

  it('accepts a well-formed signed lobby.closed event', async () => {
    const res = await post(sampleLobbyClosedEvent({ occurredAt: now() }))
    expect(res.status).toBe(202)
  })

  it('rejects a request with no signature', async () => {
    const res = await request(app)
      .post('/events')
      .send(sampleLobbyClosedEvent({ occurredAt: now() }))

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'invalid_signature' })
  })

  it('rejects a signature with no timestamp header', async () => {
    const body = sampleLobbyClosedEvent({ occurredAt: now() })
    const raw = JSON.stringify(body)
    const res = await request(app)
      .post('/events')
      .set('Content-Type', 'application/json')
      .set(WEBHOOK_SIGNATURE_HEADER, signWebhookPayload(SECRET, now(), raw))
      .send(raw)

    // Without the timestamp there is nothing to reproduce the signature over,
    // so it cannot be anything but invalid.
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'invalid_signature' })
  })

  it('rejects a signature from another secret', async () => {
    const res = await post(sampleLobbyClosedEvent({ occurredAt: now() }), OTHER_SECRET)
    expect(res.status).toBe(401)
  })

  it('rejects a body altered after signing', async () => {
    const body = sampleLobbyClosedEvent({ occurredAt: now() })
    const tampered = JSON.stringify({ ...body, type: 'account.punished' })
    const res = await send(app, tampered, { signedAt: now(), signedBody: JSON.stringify(body) })

    expect(res.status).toBe(401)
  })

  it('rejects a timestamp moved forward to replay a captured request', async () => {
    const body = sampleLobbyClosedEvent({ occurredAt: now() })
    const raw = JSON.stringify(body)
    const res = await request(app)
      .post('/events')
      .set('Content-Type', 'application/json')
      // The captured signature was made for a different instant; swapping the
      // header does not produce a signature for the new one.
      .set(WEBHOOK_TIMESTAMP_HEADER, now())
      .set(
        WEBHOOK_SIGNATURE_HEADER,
        signWebhookPayload(SECRET, new Date(clock.now().getTime() - 60_000).toISOString(), raw),
      )
      .send(raw)

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'invalid_signature' })
  })

  it('rejects a timestamp that smuggles the body into the signed material', async () => {
    const body = sampleLobbyClosedEvent({ occurredAt: now() })
    const raw = JSON.stringify(body)
    // `timestamp + "." + body` with a timestamp free to contain dots would let
    // this pair hash the same as the honest one. The strict ISO shape is what
    // makes the split unambiguous.
    const smuggled = `${now()}.${raw}`
    const res = await request(app)
      .post('/events')
      .set('Content-Type', 'application/json')
      .set(WEBHOOK_TIMESTAMP_HEADER, smuggled)
      .set(WEBHOOK_SIGNATURE_HEADER, signWebhookPayload(SECRET, smuggled, ''))
      .send(raw)

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'invalid_signature' })
  })

  it('rejects a correctly signed request replayed outside the window', async () => {
    const signedAt = new Date(clock.now().getTime() - 6 * 60 * 1000).toISOString()
    const res = await send(app, sampleLobbyClosedEvent({ occurredAt: signedAt }), { signedAt })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'expired_timestamp' })
  })

  it('accepts an old event as long as the signature is fresh', async () => {
    // A delivery the API recovered from its table hours later: `occurredAt`
    // is old on purpose, and that is not a replay.
    const occurredAt = new Date(clock.now().getTime() - 6 * 60 * 60 * 1000).toISOString()
    const res = await post(sampleLobbyClosedEvent({ occurredAt }))

    expect(res.status).toBe(202)
  })

  it('answers 400 to malformed json without leaking a stack trace', async () => {
    const res = await request(app)
      .post('/events')
      .set('Content-Type', 'application/json')
      .send('{"id":')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'invalid_json' })
    expect(res.text).not.toContain('SyntaxError')
  })

  it('rejects an unknown event type at the edge', async () => {
    const res = await post({
      id: '11111111-1111-1111-1111-000000000099',
      occurredAt: now(),
      type: 'lobby.exploded',
      payload: {},
    })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'unknown_event_type', type: 'lobby.exploded' })
  })

  it('rejects a lobby payload on a punishment event', async () => {
    const lobby = sampleLobbyClosedEvent({ occurredAt: now() })
    const res = await post({
      id: lobby.id,
      occurredAt: lobby.occurredAt,
      type: 'account.punished',
      payload: lobby.payload,
    })

    expect(res.status).toBe(400)
  })

  it('accepts system.quota_alert with no user data', async () => {
    const res = await post(sampleQuotaAlertEvent({ occurredAt: now() }))
    expect(res.status).toBe(202)
  })

  it('rejects system.quota_alert when the payload carries a user field', async () => {
    const base = sampleQuotaAlertEvent({ occurredAt: now() })
    const res = await post({
      ...base,
      payload: { ...base.payload, accountId: '11111111-1111-1111-1111-000000000001' },
    })

    expect(res.status).toBe(400)
  })

  it('answers 413 for a body above the memory ceiling, without parsing it', async () => {
    const huge = 'a'.repeat(65 * 1024)
    const res = await send(app, huge, { signedAt: now() })

    expect(res.status).toBe(413)
    expect(res.body).toEqual({ error: 'payload_too_large' })
  })
})

describe('webhook server — global rate limit', () => {
  const clock = { now: () => new Date('2026-09-14T12:00:00.000Z') }
  const now = () => clock.now().toISOString()

  it('answers 429 for a burst above the global ceiling', async () => {
    const limiter = new SlidingWindowLimiter(clock)
    const app = createWebhookServer({ secret: SECRET, clock, limiter })
    const body = sampleLobbyClosedEvent({ occurredAt: now() })

    for (let i = 0; i < WEBHOOK_RATE_LIMIT_MAX; i += 1) {
      const res = await send(app, body, { signedAt: now() })
      expect(res.status).toBe(202)
    }

    const blocked = await send(app, body, { signedAt: now() })
    expect(blocked.status).toBe(429)
    expect(blocked.body).toEqual({ error: 'rate_limited' })
  })

  it('lets the legitimate peak of 10 lobbies × 5 actions through', async () => {
    const app = createWebhookServer({ secret: SECRET, clock })
    const legitimatePeak = 10 * 5

    for (let i = 0; i < legitimatePeak; i += 1) {
      const body = sampleLobbyClosedEvent({
        id: `11111111-1111-1111-1111-${(i + 1).toString().padStart(12, '0')}`,
        occurredAt: now(),
      })
      const res = await send(app, body, { signedAt: now() })

      expect(res.status).toBe(202)
    }
  })

  it('does not spend the global budget on unsigned requests', async () => {
    const limiter = new SlidingWindowLimiter(clock)
    const app = createWebhookServer({ secret: SECRET, clock, limiter })
    const body = sampleLobbyClosedEvent({ occurredAt: now() })

    for (let i = 0; i < WEBHOOK_RATE_LIMIT_MAX; i += 1) {
      const res = await request(app).post('/events').send(body)
      expect(res.status).toBe(401)
    }

    const allowed = await send(app, body, { signedAt: now() })
    expect(allowed.status).toBe(202)
  })

  it('does not spend the global budget on a stale signature either', async () => {
    const limiter = new SlidingWindowLimiter(clock)
    const app = createWebhookServer({ secret: SECRET, clock, limiter })
    const body = sampleLobbyClosedEvent({ occurredAt: now() })
    const stale = new Date(clock.now().getTime() - 10 * 60 * 1000).toISOString()

    for (let i = 0; i < WEBHOOK_RATE_LIMIT_MAX; i += 1) {
      const res = await send(app, body, { signedAt: stale })
      expect(res.status).toBe(401)
    }

    const allowed = await send(app, body, { signedAt: now() })
    expect(allowed.status).toBe(202)
  })
})

/**
 * Issue #168: without this, the Compose healthcheck could not tell a bot with
 * a dead gateway connection from one that was fine — both answered nothing at
 * all, since there was no health endpoint.
 */
describe('GET /health', () => {
  it('answers 200 with no isReady option, so every existing caller keeps working', async () => {
    const app = createWebhookServer({ secret: SECRET })

    const res = await request(app).get('/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ discordReady: true })
  })

  it('answers 200 when the gateway is connected', async () => {
    const app = createWebhookServer({ secret: SECRET, isReady: () => true })

    const res = await request(app).get('/health')

    expect(res.status).toBe(200)
  })

  it('answers 503 when the gateway is not connected — this is what Compose must catch', async () => {
    const app = createWebhookServer({ secret: SECRET, isReady: () => false })

    const res = await request(app).get('/health')

    expect(res.status).toBe(503)
    expect(res.body).toEqual({ discordReady: false })
  })

  it('needs no signature — Compose calls it unauthenticated, on the loopback address', async () => {
    const app = createWebhookServer({ secret: SECRET, isReady: () => true })

    const res = await request(app).get('/health')

    expect(res.status).not.toBe(401)
  })
})
