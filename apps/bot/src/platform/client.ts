import {
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  readWebhookSecret,
  signWebhookPayload,
  type BotEvent,
} from '@prolobby/types'

/**
 * The bot → platform direction — RF-060, issue #150.
 *
 * The mirror of `apps/api`'s `WebhookClient`: same signature contract, same
 * headers, opposite direction. The bot signs `timestamp + "." + raw body` with
 * `WEBHOOK_SECRET` and the API refuses anything that does not match. One
 * secret, two directions, so the pair can never drift on what a valid request
 * looks like.
 *
 * The raw bytes are built once and both signed and sent, never serialised
 * twice: re-stringifying could reorder a key or change whitespace, and the
 * HMAC covers bytes, not meaning.
 */

/** Matches the API's own per-attempt window (RF-058). */
export const PLATFORM_ACK_TIMEOUT_MS = 10_000

export function platformEventsUrl(): string {
  // Same default shape as the API's `BOT_WEBHOOK_URL`: loopback in dev, the
  // internal Docker name in production, never through the Cloudflare tunnel
  // (ADR-009).
  return process.env.API_BOT_EVENTS_URL ?? 'http://127.0.0.1:3001/api/bot-events'
}

export async function postBotEvent(event: BotEvent): Promise<{ status: number }> {
  const secret = readWebhookSecret()
  const raw = Buffer.from(JSON.stringify(event))
  // Stamped per attempt, never the event's own `occurredAt`: the freshness
  // window is a replay control on the request, and the event keeps saying when
  // the person actually left or came back.
  const signedAt = new Date().toISOString()

  const response = await fetch(platformEventsUrl(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [WEBHOOK_TIMESTAMP_HEADER]: signedAt,
      [WEBHOOK_SIGNATURE_HEADER]: signWebhookPayload(secret, signedAt, raw),
    },
    body: raw,
    signal: AbortSignal.timeout(PLATFORM_ACK_TIMEOUT_MS),
  })

  return { status: response.status }
}
