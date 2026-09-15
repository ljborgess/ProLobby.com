import { Injectable } from '@nestjs/common'
import {
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  readWebhookSecret,
  signWebhookPayload,
  type PlatformEvent,
} from '@prolobby/types'

/** Per-attempt ACK window — RF-058: no confirmation in 10 s, then retry. */
export const WEBHOOK_ACK_TIMEOUT_MS = 10_000

@Injectable()
export class WebhookClient {
  async post(event: PlatformEvent): Promise<{ status: number }> {
    const secret = readWebhookSecret()
    const url = process.env.BOT_WEBHOOK_URL ?? 'http://127.0.0.1:3002/events'
    const raw = Buffer.from(JSON.stringify(event))
    // Stamped per attempt, and never the event's own `occurredAt`: a retry of
    // a two-hour-old event is still a fresh request, and the event keeps
    // saying when it actually happened.
    const signedAt = new Date().toISOString()

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [WEBHOOK_TIMESTAMP_HEADER]: signedAt,
        [WEBHOOK_SIGNATURE_HEADER]: signWebhookPayload(secret, signedAt, raw),
      },
      body: raw,
      signal: AbortSignal.timeout(WEBHOOK_ACK_TIMEOUT_MS),
    })

    return { status: response.status }
  }
}
