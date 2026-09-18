import { createHmac } from 'node:crypto'

/**
 * Deterministic HMAC for identity values — item 5 of the security checklist /
 * RNF-009, and the half of it that `encryptAtRest` cannot cover.
 *
 * RNF-009 says a Discord ID and a gamertag never sit in plain text, but both
 * are also *keys*: a Discord ID is exclusive to one account, a gamertag is
 * unique per platform, and both are compared against the ban list. Authenticated
 * encryption is non-deterministic by design, so the same value encrypts to a
 * different ciphertext every time — no unique index, no lookup, no comparison.
 * The data model resolved it in 2026-09-11 (docs/requisitos/03-dados.md) by
 * storing two columns: this HMAC for identity, and the ciphertext for display.
 *
 * One secret for every identity column, on purpose. `BlockedIdentity` exists to
 * be cross-checked against `Account.discordIdHash` and `PlatformGamertag`
 * (RF-079): a per-table secret would make the same Discord ID hash to different
 * values in the two tables, and the ban check would silently never match — the
 * exact failure the ban list was created to prevent.
 *
 * HMAC and not a bare digest: a Discord ID is a snowflake and a gamertag is
 * short, so an unkeyed hash of either is brute-forceable from a leaked dump in
 * minutes. The secret is what makes the hash useless without the server.
 */
export function hashIdentity(secret: Buffer, value: string): string {
  return createHmac('sha256', secret).update(value).digest('hex')
}

/**
 * Reads and validates `IDENTITY_HMAC_SECRET` — 32 raw bytes, base64 encoded
 * (`openssl rand -base64 32`).
 *
 * Refuses a missing or short value instead of padding it into shape, for the
 * same reason `readEvidenceEncryptionKey` does: a coerced secret is a secret
 * nobody wrote down, and this one cannot be rotated casually. Rotating it
 * invalidates every stored hash at once — uniqueness, lookups and the whole ban
 * list — so it needs a re-hash of the ciphertext columns, not a new value in the
 * environment.
 */
export function readIdentityHmacSecret(): Buffer {
  const encoded = process.env.IDENTITY_HMAC_SECRET

  if (!encoded) {
    throw new Error(
      'IDENTITY_HMAC_SECRET is required — it keys the Discord ID and gamertag hashes (item 5 of the security checklist)',
    )
  }

  const secret = Buffer.from(encoded, 'base64')

  if (secret.length < 32) {
    throw new Error('IDENTITY_HMAC_SECRET must decode to at least 32 bytes')
  }

  return secret
}
