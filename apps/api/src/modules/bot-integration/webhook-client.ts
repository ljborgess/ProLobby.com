import { Injectable } from '@nestjs/common'
import {
  WEBHOOK_SIGNATURE_HEADER,
  signWebhookBody,
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
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [WEBHOOK_SIGNATURE_HEADER]: signWebhookBody(secret, raw),
      },
      body: raw,
      signal: AbortSignal.timeout(WEBHOOK_ACK_TIMEOUT_MS),
    })

    return { status: response.status }
  }
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
