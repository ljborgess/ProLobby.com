import { createHmac, timingSafeEqual } from 'node:crypto'

/** Header carrying the hex HMAC-SHA256 of `timestamp + "." + raw body`. */
export const WEBHOOK_SIGNATURE_HEADER = 'x-webhook-signature'

/**
 * Header carrying the ISO instant the request was *signed*.
 *
 * Deliberately not the event's `occurredAt`. The freshness window is a replay
 * control and belongs to the transport: the sender stamps it fresh on every
 * attempt, so a delivery recovered from the database hours after a restart
 * still authenticates, while a captured request stops working after the
 * window. Tying the window to `occurredAt` would force the sender to keep
 * rewriting when the event happened — which is exactly how a business
 * timestamp gets destroyed to satisfy a security check.
 */
export const WEBHOOK_TIMESTAMP_HEADER = 'x-webhook-timestamp'

/**
 * Five minutes. Long enough for a slow attempt (RF-058 waits up to 10 s for
 * the ACK), short enough that a captured request cannot be replayed later.
 */
export const WEBHOOK_MAX_SKEW_MS = 5 * 60 * 1000

/**
 * Exactly `YYYY-MM-DDTHH:MM:SS.sssZ`, nothing else.
 *
 * Strict on purpose, and it is the signature's business, not only the
 * window's: the signed material is `timestamp + "." + body`, and an ISO
 * instant already contains a dot. Left loose, `("<ts>.<body>", "")` and
 * `("<ts>", "<body>")` would hash identically — the classic ambiguity of
 * concatenating two attacker-visible fields with a separator that can appear
 * inside one of them. A fixed-shape timestamp makes the split unambiguous.
 */
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

/**
 * The signed material is `timestamp + "." + body`, never the body alone:
 * signing only the body would leave the timestamp free to edit, and a
 * captured request could be replayed forever by moving it forward.
 */
export function signWebhookPayload(
  secret: string,
  timestampIso: string,
  rawBody: Buffer | string,
): string {
  return hmac(secret, timestampIso, rawBody).toString('hex')
}

/**
 * Constant-time compare. Returning early on a length mismatch would leak the
 * expected size; the dummy compare keeps both paths in `timingSafeEqual`.
 */
export function verifyWebhookSignature(
  secret: string,
  timestampIso: string | undefined,
  rawBody: Buffer | string,
  signatureHex: string | undefined,
): boolean {
  const expected = hmac(secret, timestampIso ?? '', rawBody)

  if (!timestampIso || !signatureHex || !ISO_INSTANT.test(timestampIso)) {
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
  timestampIso: string,
  now: Date,
  maxSkewMs: number,
): boolean {
  if (!ISO_INSTANT.test(timestampIso)) {
    return false
  }

  const signedAt = new Date(timestampIso)
  if (Number.isNaN(signedAt.getTime())) {
    return false
  }

  return Math.abs(now.getTime() - signedAt.getTime()) <= maxSkewMs
}

/**
 * Shared by apps/bot (WEBHOOK_SECRET used to verify incoming events) and
 * apps/api (same value used to sign outgoing ones) — one place so the two
 * never drift on what counts as a valid secret.
 */
export function readWebhookSecret(): string {
  const secret = process.env.WEBHOOK_SECRET
  if (!secret || secret === 'changeme') {
    throw new Error(
      'WEBHOOK_SECRET is required and must not be the placeholder — it authenticates kick/ban/channel commands (items 1 and 6 of the security checklist)',
    )
  }
  return secret
}

function hmac(secret: string, timestampIso: string, rawBody: Buffer | string): Buffer {
  return createHmac('sha256', secret).update(timestampIso).update('.').update(rawBody).digest()
}
