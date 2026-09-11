import { completedYears, isOldEnough, MINIMUM_AGE } from './account.age'

describe('age', () => {
  const reference = new Date('2026-09-11T12:00:00Z')

  it('counts a birthday that already happened this year', () => {
    expect(completedYears(new Date('2000-01-01'), reference)).toBe(26)
  })

  it('does not count a birthday still to come this year', () => {
    expect(completedYears(new Date('2000-12-31'), reference)).toBe(25)
  })

  it('counts the birthday itself as completed', () => {
    // The only date where the answer changes, and the one a naive
    // milliseconds-per-year division gets wrong.
    expect(completedYears(new Date('2010-09-11'), reference)).toBe(16)
  })

  it('handles 29 February without inventing a year', () => {
    expect(completedYears(new Date('2008-02-29'), new Date('2026-02-28T12:00:00Z'))).toBe(17)
    expect(completedYears(new Date('2008-02-29'), new Date('2026-03-01T12:00:00Z'))).toBe(18)
  })

  describe('RF-021 — minimum age', () => {
    it('refuses one day short of 16', () => {
      expect(isOldEnough(new Date('2010-09-12'), reference)).toBe(false)
    })

    it('accepts exactly 16 on the birthday', () => {
      expect(isOldEnough(new Date('2010-09-11'), reference)).toBe(true)
    })

    it('uses the documented threshold', () => {
      expect(MINIMUM_AGE).toBe(16)
    })
  })
})
