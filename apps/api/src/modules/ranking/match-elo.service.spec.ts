import { eloDelta, kFactor } from './match-elo.service'

describe('match elo (RF-077)', () => {
  it('moves by K times the surprise, checked by hand', () => {
    // Even sides: expected 0.5.
    expect(eloDelta(32, 1000, 1000, 1)).toBe(16)
    expect(eloDelta(32, 1000, 1000, 0)).toBe(-16)
    expect(eloDelta(20, 1000, 1000, 0.5)).toBe(0)
    // 1100 against 1000: expected 1 / (1 + 10^(-0.25)) = 0.6401.
    expect(eloDelta(32, 1100, 1000, 1)).toBe(12) // 32 × 0.3599 = 11.5
    expect(eloDelta(20, 1000, 1100, 1)).toBe(13) // 20 × 0.6401 = 12.8
    expect(eloDelta(32, 1000, 1100, 0.5)).toBe(4) // 32 × 0.1401 = 4.48
  })

  it('uses 32 up to the 9th match in the category and 20 from the 10th', () => {
    expect(kFactor(0)).toBe(32)
    expect(kFactor(8)).toBe(32) // the 9th
    expect(kFactor(9)).toBe(20) // the 10th
  })
})
