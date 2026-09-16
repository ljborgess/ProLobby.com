import { randomBytes } from 'node:crypto'

import { decryptAtRest, encryptAtRest, readEvidenceEncryptionKey } from './evidence-encryption'

const KEY = randomBytes(32)

describe('encryptAtRest / decryptAtRest', () => {
  it('round-trips the original bytes', () => {
    const plaintext = Buffer.from('a real screenshot, in spirit')

    const encrypted = encryptAtRest(KEY, plaintext)
    const decrypted = decryptAtRest(KEY, encrypted)

    expect(decrypted.equals(plaintext)).toBe(true)
  })

  it('never stores the plaintext bytes anywhere in the ciphertext', () => {
    const plaintext = Buffer.from('a needle nobody should find in the haystack')

    const encrypted = encryptAtRest(KEY, plaintext)

    expect(encrypted.includes(plaintext)).toBe(false)
  })

  it('produces a different file every time, even for the same input', () => {
    const plaintext = Buffer.from('same bytes, twice')

    const first = encryptAtRest(KEY, plaintext)
    const second = encryptAtRest(KEY, plaintext)

    // A fresh random IV each call — otherwise two identical screenshots
    // would encrypt to identical files, leaking that they are the same
    // image without ever decrypting either.
    expect(first.equals(second)).toBe(false)
  })

  it('fails closed on a tampered file instead of decrypting to garbage', () => {
    const encrypted = encryptAtRest(KEY, Buffer.from('trust me, this is a print'))
    encrypted[encrypted.length - 1] = (encrypted[encrypted.length - 1]! + 1) % 256

    // GCM's tag catches this: a moderator must never be shown corrupted
    // bytes decoded as if they were a real image.
    expect(() => decryptAtRest(KEY, encrypted)).toThrow()
  })

  it('refuses to decrypt with the wrong key', () => {
    const encrypted = encryptAtRest(KEY, Buffer.from('only readable with the right key'))

    expect(() => decryptAtRest(randomBytes(32), encrypted)).toThrow()
  })
})

describe('readEvidenceEncryptionKey', () => {
  const ORIGINAL = process.env.EVIDENCE_ENCRYPTION_KEY

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.EVIDENCE_ENCRYPTION_KEY
    } else {
      process.env.EVIDENCE_ENCRYPTION_KEY = ORIGINAL
    }
  })

  it('decodes a valid base64 32-byte key', () => {
    process.env.EVIDENCE_ENCRYPTION_KEY = randomBytes(32).toString('base64')

    expect(readEvidenceEncryptionKey()).toHaveLength(32)
  })

  it('refuses when the variable is missing', () => {
    delete process.env.EVIDENCE_ENCRYPTION_KEY

    expect(() => readEvidenceEncryptionKey()).toThrow(/required/)
  })

  it('refuses a key that decodes to the wrong length', () => {
    process.env.EVIDENCE_ENCRYPTION_KEY = randomBytes(16).toString('base64')

    expect(() => readEvidenceEncryptionKey()).toThrow(/32 bytes/)
  })
})
