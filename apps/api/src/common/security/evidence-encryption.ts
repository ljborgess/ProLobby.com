import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

/**
 * Encrypts a file at rest — item 5 of the security checklist / RNF-009.
 *
 * "Print, foto, Discord ID, gamertag — não em texto puro no banco nem no
 * storage" names print specifically, and the item has no "later phase"
 * caveat the way item 4 (RLS) does. It applies from the first byte any of
 * those is written, regardless of whether the storage itself is provisional
 * (a local file today, the Oracle Object Storage bucket from ADR-009 once
 * phase 2.2 wires it up) — the bucket move changes *where* the bytes live,
 * never *whether* they are readable without the key.
 *
 * AES-256-GCM: authenticated, so a tampered or truncated file fails to
 * decrypt instead of silently returning garbage a moderator might mistake
 * for a real screenshot. Layout is `iv (12 bytes) | authTag (16 bytes) |
 * ciphertext` — one file, one secret to manage, no separate sidecar that
 * could get out of sync with it.
 */
const IV_BYTES = 12
const AUTH_TAG_BYTES = 16

export function encryptAtRest(secret: Buffer, plaintext: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', secret, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext])
}

export function decryptAtRest(secret: Buffer, encrypted: Buffer): Buffer {
  const iv = encrypted.subarray(0, IV_BYTES)
  const authTag = encrypted.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES)
  const ciphertext = encrypted.subarray(IV_BYTES + AUTH_TAG_BYTES)

  const decipher = createDecipheriv('aes-256-gcm', secret, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

/**
 * Reads and validates `EVIDENCE_ENCRYPTION_KEY` — 32 raw bytes, base64
 * encoded (`openssl rand -base64 32`), the key size AES-256 requires.
 *
 * Refuses a missing or wrong-length value at the call site rather than
 * padding or hashing it into shape: a silently-coerced key is a key nobody
 * actually wrote down, and RNF-021's whole point is that a secret must be
 * the thing the operator generated, not a derivative of whatever they typed.
 */
export function readEvidenceEncryptionKey(): Buffer {
  const encoded = process.env.EVIDENCE_ENCRYPTION_KEY

  if (!encoded) {
    throw new Error(
      'EVIDENCE_ENCRYPTION_KEY is required — it encrypts evidence files at rest (item 5 of the security checklist)',
    )
  }

  const key = Buffer.from(encoded, 'base64')

  if (key.length !== 32) {
    throw new Error('EVIDENCE_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256)')
  }

  return key
}
