import {
  base32,
  generateRecoveryCodes,
  hashRecoveryCode,
  otpauthUrl,
  stepOf,
  totpAt,
  verifyTotp,
} from './totp'

// RFC 6238 appendix B, SHA-1 secret "12345678901234567890". The RFC lists 8
// digits; this profile keeps the last 6.
const RFC_SECRET = Buffer.from('12345678901234567890')

describe('totp', () => {
  it('matches the RFC 6238 test vectors', () => {
    expect(totpAt(RFC_SECRET, stepOf(new Date(59_000)))).toBe('287082')
    expect(totpAt(RFC_SECRET, stepOf(new Date(1_111_111_109_000)))).toBe('081804')
    expect(totpAt(RFC_SECRET, stepOf(new Date(2_000_000_000_000)))).toBe('279037')
  })

  it('accepts the code one step either side, and nothing further', () => {
    const now = new Date(1_111_111_109_000)
    const step = stepOf(now)

    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step - 1), now, null)).toBe(step - 1)
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step + 1), now, null)).toBe(step + 1)
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step - 2), now, null)).toBeNull()
  })

  it('refuses a code already used, even inside its window', () => {
    const now = new Date(1_111_111_109_000)
    const step = stepOf(now)

    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step), now, step)).toBeNull()
  })

  it('refuses anything that is not six digits', () => {
    expect(verifyTotp(RFC_SECRET, '12345', new Date(), null)).toBeNull()
    expect(verifyTotp(RFC_SECRET, 'abcdef', new Date(), null)).toBeNull()
  })

  it('encodes base32 like RFC 4648 and builds an otpauth link without spaces', () => {
    expect(base32(Buffer.from('foobar'))).toBe('MZXW6YTBOI')
    expect(otpauthUrl(RFC_SECRET, 'mod@prolobby.local')).toMatch(
      /^otpauth:\/\/totp\/ProLobby%3Amod%40prolobby\.local\?secret=[A-Z2-7]+&issuer=ProLobby/,
    )
  })

  it('makes ten distinct recovery codes and hashes them case-insensitively', () => {
    const codes = generateRecoveryCodes()

    expect(new Set(codes).size).toBe(10)
    expect(codes[0]).toMatch(/^[a-z2-7]{4}-[a-z2-7]{4}$/)
    expect(hashRecoveryCode(codes[0]!.toUpperCase())).toBe(hashRecoveryCode(codes[0]!))
  })
})
