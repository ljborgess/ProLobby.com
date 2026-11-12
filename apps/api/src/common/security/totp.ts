import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * TOTP (RFC 6238, HMAC-SHA1, 30 s, 6 digits) for the moderation panel's second
 * factor — #311, RNF-010. Plain `node:crypto`: the algorithm is a few lines,
 * and every authenticator app (Google, Authy, 1Password) speaks this exact
 * profile.
 */
const STEP_SECONDS = 30
const DIGITS = 6
/** One step either side: a phone clock a few seconds off still works. */
const DRIFT_STEPS = 1
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** 160 random bits, the size RFC 4226 recommends for the shared secret. */
export function generateTotpSecret(): Buffer {
  return randomBytes(20)
}

export function base32(bytes: Buffer): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31]
  return out
}

/** What the authenticator app scans or opens: issuer and account label, no secret in logs. */
export function otpauthUrl(secret: Buffer, label: string): string {
  const issuer = 'ProLobby'
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${label}`)}?secret=${base32(secret)}&issuer=${issuer}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`
}

export function totpAt(secret: Buffer, step: number): string {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(step))
  const hmac = createHmac('sha1', secret).update(counter).digest()
  const offset = hmac[hmac.length - 1]! & 0x0f
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0')
}

export const stepOf = (now: Date): number => Math.floor(now.getTime() / 1000 / STEP_SECONDS)

/**
 * The step a code belongs to, or null. A step at or before `lastStep` is
 * refused even when the digits match: a code seen once — over a shoulder, in a
 * phishing page — must not open a second session.
 */
export function verifyTotp(
  secret: Buffer,
  code: string,
  now: Date,
  lastStep: number | null,
): number | null {
  if (!/^\d{6}$/.test(code)) return null
  const current = stepOf(now)
  for (let step = current - DRIFT_STEPS; step <= current + DRIFT_STEPS; step++) {
    if (lastStep !== null && step <= lastStep) continue
    const expected = Buffer.from(totpAt(secret, step))
    if (timingSafeEqual(expected, Buffer.from(code))) return step
  }
  return null
}

/** Ten single-use recovery codes, `xxxx-xxxx`, about 40 bits each. */
export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = base32(randomBytes(5)).toLowerCase()
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`
  })
}

/**
 * Recovery codes are random and long enough that a fast hash is the right one:
 * there is no dictionary to slow down, only a stored value that must not be
 * the code itself.
 */
export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code.trim().toLowerCase()).digest('hex')
}
