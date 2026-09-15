import { createHash, randomBytes } from 'node:crypto'

/**
 * Single-use tokens that travel by email — verification links and password
 * resets.
 *
 * 32 bytes of CSPRNG in base64url: there is nothing to guess, so the stored
 * copy is a plain SHA-256 rather than argon2. argon2 exists to protect
 * low-entropy secrets that people choose; nobody chooses these.
 */
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

/** What gets stored and looked up — never the token itself. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
