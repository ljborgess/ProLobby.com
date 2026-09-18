import { randomBytes } from 'node:crypto'

import { hashIdentity, readIdentityHmacSecret } from './identity-hmac'

const SECRET = randomBytes(32)
const DISCORD_ID = '284327384932483072'

describe('hashIdentity', () => {
  it('is deterministic, which is what makes the unique index possible', () => {
    expect(hashIdentity(SECRET, DISCORD_ID)).toBe(hashIdentity(SECRET, DISCORD_ID))
  })

  it('fits the varchar(64) the identity columns declare', () => {
    expect(hashIdentity(SECRET, DISCORD_ID)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('never contains the value it hashed', () => {
    expect(hashIdentity(SECRET, DISCORD_ID)).not.toContain(DISCORD_ID)
  })

  it('separates values that differ by one character', () => {
    expect(hashIdentity(SECRET, DISCORD_ID)).not.toBe(hashIdentity(SECRET, `${DISCORD_ID}1`))
  })

  // The ban list only works because BlockedIdentity and Account hash with the
  // same secret (RF-079). If this ever stops holding, a banned Discord ID
  // silently fails to match on the next link attempt.
  it('is the same across tables, because the secret is shared', () => {
    const fromAccount = hashIdentity(SECRET, DISCORD_ID)
    const fromBanList = hashIdentity(SECRET, DISCORD_ID)

    expect(fromAccount).toBe(fromBanList)
  })

  it('produces a different hash under a different secret', () => {
    expect(hashIdentity(SECRET, DISCORD_ID)).not.toBe(hashIdentity(randomBytes(32), DISCORD_ID))
  })
})

describe('readIdentityHmacSecret', () => {
  const original = process.env.IDENTITY_HMAC_SECRET

  afterEach(() => {
    if (original === undefined) {
      delete process.env.IDENTITY_HMAC_SECRET
    } else {
      process.env.IDENTITY_HMAC_SECRET = original
    }
  })

  it('decodes a base64 secret', () => {
    process.env.IDENTITY_HMAC_SECRET = SECRET.toString('base64')

    expect(readIdentityHmacSecret().equals(SECRET)).toBe(true)
  })

  it('refuses a missing secret instead of hashing with nothing', () => {
    delete process.env.IDENTITY_HMAC_SECRET

    expect(() => readIdentityHmacSecret()).toThrow('IDENTITY_HMAC_SECRET is required')
  })

  it('refuses a secret too short to be worth keying', () => {
    process.env.IDENTITY_HMAC_SECRET = randomBytes(16).toString('base64')

    expect(() => readIdentityHmacSecret()).toThrow('at least 32 bytes')
  })
})
