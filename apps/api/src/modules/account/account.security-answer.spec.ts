import { normaliseSecurityAnswer } from './account.security-answer'

describe('normaliseSecurityAnswer', () => {
  it('folds case, accents and inner whitespace to the same value', () => {
    // All of these must hash identically, or the legitimate person fails their
    // own recovery factor (RF-025) — having already lost email and Discord.
    expect(normaliseSecurityAnswer('São Paulo')).toBe('sao paulo')
    expect(normaliseSecurityAnswer('SAO PAULO')).toBe('sao paulo')
    expect(normaliseSecurityAnswer(' São  Paulo ')).toBe('sao paulo')
    expect(normaliseSecurityAnswer('são  paulo')).toBe('sao paulo')
  })

  it('keeps distinct answers distinct', () => {
    // Folding must not go so far that different answers collide.
    expect(normaliseSecurityAnswer('Palmeiras')).not.toBe(normaliseSecurityAnswer('Palmeira'))
  })

  it('handles every accent the region actually types', () => {
    expect(normaliseSecurityAnswer('Grêmio')).toBe('gremio')
    expect(normaliseSecurityAnswer('Atlético')).toBe('atletico')
    expect(normaliseSecurityAnswer('Coruña')).toBe('coruna')
    expect(normaliseSecurityAnswer('Içara')).toBe('icara')
  })

  it('does not collapse an empty-ish answer into something valid', () => {
    // The DTO enforces a minimum length before this runs; this guards the case
    // where the length was all whitespace.
    expect(normaliseSecurityAnswer('   ')).toBe('')
  })
})
