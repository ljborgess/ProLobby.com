import request from 'supertest'
import { createWebhookServer } from './server'

describe('webhook server', () => {
  const app = createWebhookServer()

  it('accepts a well-formed platform event', async () => {
    const res = await request(app).post('/events').send({
      id: '11111111-1111-1111-1111-111111111111',
      type: 'lobby.fechado',
      occurredAt: new Date().toISOString(),
      payload: {},
    })

    expect(res.status).toBe(202)
  })

  it('rejects a malformed event', async () => {
    const res = await request(app).post('/events').send({ type: 'lobby.fechado' })

    expect(res.status).toBe(400)
  })
})
