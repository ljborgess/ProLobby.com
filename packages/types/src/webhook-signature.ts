import { createHmac, timingSafeEqual } from 'node:crypto'

/** Header carrying the hex HMAC-SHA256 of the raw request body. */
export const WEBHOOK_SIGNATURE_HEADER = 'x-webhook-signature'

/**
 * Five minutes. Long enough for a slow retry (RF-058's first 10 s wait),
 * short enough that a captured request cannot be replayed after the window.
 */
export const WEBHOOK_MAX_SKEW_MS = 5 * 60 * 1000

export function signWebhookBody(secret: string, rawBody: Buffer | string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex')
}

/**
 * Constant-time compare. Returning early on a length mismatch would leak the
 * expected size; the dummy compare keeps both paths in `timingSafeEqual`.
 */
export function verifyWebhookSignature(
  secret: string,
  rawBody: Buffer | string,
  signatureHex: string | undefined,
): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest()

  if (!signatureHex) {
    timingSafeEqual(expected, expected)
    return false
  }

  if (!/^[0-9a-f]+$/i.test(signatureHex) || signatureHex.length !== expected.length * 2) {
    timingSafeEqual(expected, expected)
    return false
  }

  const provided = Buffer.from(signatureHex, 'hex')
  if (provided.length !== expected.length) {
    timingSafeEqual(expected, expected)
    return false
  }

  return timingSafeEqual(provided, expected)
}

export function isWebhookTimestampFresh(
  occurredAtIso: string,
  now: Date,
  maxSkewMs: number,
): boolean {
  const occurredAt = new Date(occurredAtIso)
  if (Number.isNaN(occurredAt.getTime())) {
    return false
  }

  return Math.abs(now.getTime() - occurredAt.getTime()) <= maxSkewMs
}
