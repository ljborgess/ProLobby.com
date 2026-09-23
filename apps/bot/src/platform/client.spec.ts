import {
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  verifyWebhookSignature,
  type BotEvent,
} from '@prolobby/types'

import { platformEventsUrl, postBotEvent } from './client'

/**
 * The signature the API will check, checked here with the API's own verifier —
 * issue #150.
 *
 * Asserting the header "looks like a hash" would pass while signing the wrong
 * material. `verifyWebhookSignature` is the exact function
 * `BotEventsController` runs, so a change that breaks the pair fails here
 * rather than at runtime against a real Discord event.
 */
const SECRET = 'test-webhook-secret-not-the-placeholder'

const event: BotEvent = {
  id: '11111111-1111-1111-1111-111111111111',
  occurredAt: '2026-09-23T12:00:00.000Z',
  type: 'discord.member_left',
  payload: { discordId: '123456789012345678' },
}

describe('postBotEvent', () => {
  const originalSecret = process.env.WEBHOOK_SECRET
  const originalUrl = process.env.API_BOT_EVENTS_URL

  beforeEach(() => {
    process.env.WEBHOOK_SECRET = SECRET
  })

  afterEach(() => {
    process.env.WEBHOOK_SECRET = originalSecret
    if (originalUrl === undefined) {
      delete process.env.API_BOT_EVENTS_URL
    } else {
      process.env.API_BOT_EVENTS_URL = originalUrl
    }
    jest.restoreAllMocks()
  })

  it('signs the exact bytes it sends, so the API verifier accepts them', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response(null, { status: 204 }))
    global.fetch = fetchMock as unknown as typeof fetch

    await postBotEvent(event)

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    const body = init.body as Buffer

    expect(
      verifyWebhookSignature(
        SECRET,
        headers[WEBHOOK_TIMESTAMP_HEADER],
        body,
        headers[WEBHOOK_SIGNATURE_HEADER],
      ),
    ).toBe(true)
    // The bytes on the wire are the bytes that were signed: re-serialising
    // could reorder a key and the HMAC covers bytes, not meaning.
    expect(JSON.parse(body.toString('utf8'))).toEqual(event)
  })

  it('stamps the signing time per attempt, not the event’s occurredAt', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response(null, { status: 204 }))
    global.fetch = fetchMock as unknown as typeof fetch

    await postBotEvent(event)

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const signedAt = (init.headers as Record<string, string>)[WEBHOOK_TIMESTAMP_HEADER]
    // The freshness window is a replay control on the request. Tying it to the
    // event's own timestamp would make a delayed report unauthenticable.
    expect(signedAt).not.toBe(event.occurredAt)
    expect(Date.now() - new Date(signedAt ?? 0).getTime()).toBeLessThan(5_000)
  })

  it('refuses to sign with the placeholder secret', async () => {
    process.env.WEBHOOK_SECRET = 'changeme'

    await expect(postBotEvent(event)).rejects.toThrow(/WEBHOOK_SECRET/)
  })

  it('targets the API’s internal address, overridable for the container network', () => {
    delete process.env.API_BOT_EVENTS_URL
    expect(platformEventsUrl()).toBe('http://127.0.0.1:3001/api/bot-events')

    process.env.API_BOT_EVENTS_URL = 'http://api:3001/api/bot-events'
    expect(platformEventsUrl()).toBe('http://api:3001/api/bot-events')
  })
})
