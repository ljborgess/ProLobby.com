import request from 'supertest'
import { WEBHOOK_SIGNATURE_HEADER, signWebhookBody } from '@prolobby/types'

import { createWebhookServer } from './server'

const SECRET = 'test-webhook-secret-not-the-placeholder'
const OTHER_SECRET = 'some-other-secret-also-not-a-placeholder'

const event = (occurredAt: string) => ({
  id: '11111111-1111-1111-1111-111111111111',
  type: 'lobby.closed',
  occurredAt,
  payload: {},
})

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

  it('accepts a well-formed signed platform event', async () => {
    const res = await post(event(clock.now().toISOString()))
    expect(res.status).toBe(202)
  })

  it('rejects a request with no signature', async () => {
    const res = await request(app).post('/events').send(event(clock.now().toISOString()))
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'invalid_signature' })
  })

  it('rejects a signature from another secret', async () => {
    const res = await post(event(clock.now().toISOString()), OTHER_SECRET)
    expect(res.status).toBe(401)
  })

  it('rejects a body altered after signing', async () => {
    const body = event(clock.now().toISOString())
    const raw = Buffer.from(JSON.stringify(body))
    const tampered = Buffer.from(JSON.stringify({ ...body, type: 'lobby.opened' }))
    const res = await request(app)
      .post('/events')
      .set('Content-Type', 'application/json')
      .set(WEBHOOK_SIGNATURE_HEADER, signWebhookBody(SECRET, raw))
      .send(tampered.toString('utf8'))

    expect(res.status).toBe(401)
  })

  it('rejects a valid signature replayed outside the timestamp window', async () => {
    const occurredAt = new Date(clock.now().getTime() - 6 * 60 * 1000).toISOString()
    const res = await post(event(occurredAt))
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'expired_timestamp' })
  })

  it('rejects a malformed event', async () => {
    const res = await post({ type: 'lobby.closed' })
    expect(res.status).toBe(400)
  })
})
