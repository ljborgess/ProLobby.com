import request from 'supertest'
import {
  WEBHOOK_SIGNATURE_HEADER,
  sampleLobbyClosedEvent,
  sampleQuotaAlertEvent,
  signWebhookBody,
} from '@prolobby/types'

import { SlidingWindowLimiter, WEBHOOK_RATE_LIMIT_MAX } from './rate-limit'
import { createWebhookServer } from './server'

const SECRET = 'test-webhook-secret-not-the-placeholder'
const OTHER_SECRET = 'some-other-secret-also-not-a-placeholder'

describe('webhook server', () => {
  const clock = { now: () => new Date('2026-09-14T12:00:00.000Z') }
  const app = createWebhookServer({ secret: SECRET, clock })

  const post = (body: object, secret = SECRET) => {
    const raw = Buffer.from(JSON.stringify(body))
    return request(app)
      .post('/events')
      .set('Content-Type', 'application/json')
      .set(WEBHOOK_SIGNATURE_HEADER, signWebhookBody(secret, raw))
      .send(raw.toString('utf8'))
  }

  it('accepts a well-formed signed lobby.closed event', async () => {
    const res = await post(sampleLobbyClosedEvent({ occurredAt: clock.now().toISOString() }))
    expect(res.status).toBe(202)
  })

  it('rejects a request with no signature', async () => {
    const body = sampleLobbyClosedEvent({ occurredAt: clock.now().toISOString() })
    const res = await request(app).post('/events').send(body)
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'invalid_signature' })
  })

  it('rejects a signature from another secret', async () => {
    const res = await post(
      sampleLobbyClosedEvent({ occurredAt: clock.now().toISOString() }),
      OTHER_SECRET,
    )
    expect(res.status).toBe(401)
  })

  it('rejects a body altered after signing', async () => {
    const body = sampleLobbyClosedEvent({ occurredAt: clock.now().toISOString() })
    const raw = Buffer.from(JSON.stringify(body))
    const tampered = Buffer.from(JSON.stringify({ ...body, type: 'account.punished' }))
    const res = await request(app)
      .post('/events')
      .set('Content-Type', 'application/json')
      .set(WEBHOOK_SIGNATURE_HEADER, signWebhookBody(SECRET, raw))
      .send(tampered.toString('utf8'))

    expect(res.status).toBe(401)
  })

  it('rejects a valid signature replayed outside the timestamp window', async () => {
    const occurredAt = new Date(clock.now().getTime() - 6 * 60 * 1000).toISOString()
    const res = await post(sampleLobbyClosedEvent({ occurredAt }))
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'expired_timestamp' })
  })

  it('rejects an unknown event type at the edge', async () => {
    const res = await post({
      id: '11111111-1111-1111-1111-000000000099',
      occurredAt: clock.now().toISOString(),
      type: 'lobby.exploded',
      payload: {},
    })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'unknown_event_type', type: 'lobby.exploded' })
  })

  it('rejects a lobby payload on a punishment event', async () => {
    const lobby = sampleLobbyClosedEvent({ occurredAt: clock.now().toISOString() })
    const res = await post({
      id: lobby.id,
      occurredAt: lobby.occurredAt,
      type: 'account.punished',
      payload: lobby.payload,
    })

    expect(res.status).toBe(400)
  })

  it('accepts system.quota_alert with no user data', async () => {
    const res = await post(sampleQuotaAlertEvent({ occurredAt: clock.now().toISOString() }))
    expect(res.status).toBe(202)
  })

  it('rejects system.quota_alert when the payload carries a user field', async () => {
    const base = sampleQuotaAlertEvent({ occurredAt: clock.now().toISOString() })
    const res = await post({
      ...base,
      payload: { ...base.payload, accountId: '11111111-1111-1111-1111-000000000001' },
    })

    expect(res.status).toBe(400)
  })

  it('answers 413 for a body above the memory ceiling, without parsing it', async () => {
    const huge = Buffer.alloc(65 * 1024, 0x61)
    const res = await request(app)
      .post('/events')
      .set('Content-Type', 'application/json')
      .set(WEBHOOK_SIGNATURE_HEADER, signWebhookBody(SECRET, huge))
      .send(huge)

    expect(res.status).toBe(413)
    expect(res.body).toEqual({ error: 'payload_too_large' })
  })
})

describe('webhook server — global rate limit', () => {
  it('answers 429 for a burst above the global ceiling', async () => {
    const clock = { now: () => new Date('2026-09-14T12:00:00.000Z') }
    const limiter = new SlidingWindowLimiter(clock)
    const app = createWebhookServer({ secret: SECRET, clock, limiter })
    const body = sampleLobbyClosedEvent({ occurredAt: clock.now().toISOString() })
    const raw = Buffer.from(JSON.stringify(body))
    const signature = signWebhookBody(SECRET, raw)

    const send = () =>
      request(app)
        .post('/events')
        .set('Content-Type', 'application/json')
        .set(WEBHOOK_SIGNATURE_HEADER, signature)
        .send(raw.toString('utf8'))

    for (let i = 0; i < WEBHOOK_RATE_LIMIT_MAX; i += 1) {
      const res = await send()
      expect(res.status).toBe(202)
    }

    const blocked = await send()
    expect(blocked.status).toBe(429)
    expect(blocked.body).toEqual({ error: 'rate_limited' })
  })

  it('lets the legitimate peak of 10 lobbies × 5 actions through', async () => {
    const clock = { now: () => new Date('2026-09-14T15:00:00.000Z') }
    const app = createWebhookServer({ secret: SECRET, clock })
    const legitimatePeak = 10 * 5

    for (let i = 0; i < legitimatePeak; i += 1) {
      const body = sampleLobbyClosedEvent({
        id: `11111111-1111-1111-1111-${(i + 1).toString().padStart(12, '0')}`,
        occurredAt: clock.now().toISOString(),
      })
      const raw = Buffer.from(JSON.stringify(body))
      const res = await request(app)
        .post('/events')
        .set('Content-Type', 'application/json')
        .set(WEBHOOK_SIGNATURE_HEADER, signWebhookBody(SECRET, raw))
        .send(raw.toString('utf8'))

      expect(res.status).toBe(202)
    }
  })

  it('does not spend the global budget on unsigned requests', async () => {
    const clock = { now: () => new Date('2026-09-14T16:00:00.000Z') }
    const limiter = new SlidingWindowLimiter(clock)
    const app = createWebhookServer({ secret: SECRET, clock, limiter })
    const body = sampleLobbyClosedEvent({ occurredAt: clock.now().toISOString() })

    for (let i = 0; i < WEBHOOK_RATE_LIMIT_MAX; i += 1) {
      const res = await request(app).post('/events').send(body)
      expect(res.status).toBe(401)
    }

    const raw = Buffer.from(JSON.stringify(body))
    const allowed = await request(app)
      .post('/events')
      .set('Content-Type', 'application/json')
      .set(WEBHOOK_SIGNATURE_HEADER, signWebhookBody(SECRET, raw))
      .send(raw.toString('utf8'))

    expect(allowed.status).toBe(202)
  })
})
