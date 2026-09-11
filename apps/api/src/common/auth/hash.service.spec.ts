import { HashService } from './hash.service'

describe('HashService', () => {
  const service = new HashService()

  it('never stores the plain text value', async () => {
    const password = 'test-password-123'
    const result = await service.hash(password)

    expect(result).not.toContain(password)
    expect(result.startsWith('$argon2id$')).toBe(true)
  })

  it('produces a different hash for the same value (per-hash salt)', async () => {
    const password = 'test-password-123'

    // Identical hashes for the same input would mean a fixed or missing salt,
    // which makes precomputed hash tables viable.
    expect(await service.hash(password)).not.toBe(await service.hash(password))
  })

  it('matches the right value and rejects the wrong one', async () => {
    const stored = await service.hash('test-password-123')

    expect(await service.matches('test-password-123', stored)).toBe(true)
    expect(await service.matches('test-password-124', stored)).toBe(false)
  })

  it('rejects a malformed hash instead of throwing', async () => {
    expect(await service.matches('anything', 'not-a-hash')).toBe(false)
    expect(await service.matches('anything', '')).toBe(false)
  })
})
