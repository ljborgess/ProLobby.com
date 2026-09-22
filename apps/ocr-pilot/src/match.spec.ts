import { firstPassAccepted, matchFields } from './match'
import type { ExpectedFields, ExtractedFields } from './types'

const extracted = (overrides: Partial<ExtractedFields> = {}): ExtractedFields => ({
  overall: null,
  gamertag: null,
  position: null,
  attributes: { acceleration: 85, finishing: 76 },
  ...overrides,
})

describe('matchFields', () => {
  it('does not require overall or gamertag when the gabarito left them null', () => {
    const expected: ExpectedFields = {
      overall: null,
      gamertag: null,
      position: null,
      attributes: { acceleration: 85, finishing: 76 },
    }
    expect(matchFields(expected, extracted())).toEqual({
      mismatchedFields: [],
      gamertagMismatch: false,
    })
  })

  it('flags a gamertag mismatch only when the gabarito asserted one', () => {
    const expected: ExpectedFields = {
      overall: 88,
      gamertag: 'ProPlayer',
      position: null,
      attributes: { acceleration: 85 },
    }
    const match = matchFields(expected, extracted({ overall: 88, gamertag: 'someone-else' }))
    expect(match.gamertagMismatch).toBe(true)
    expect(match.mismatchedFields).toContain('gamertag')
  })

  it('lists the attribute keys that diverged', () => {
    const expected: ExpectedFields = {
      overall: null,
      gamertag: null,
      position: null,
      attributes: { acceleration: 85, finishing: 70 },
    }
    expect(matchFields(expected, extracted()).mismatchedFields).toEqual(['attributes.finishing'])
  })
})

describe('firstPassAccepted', () => {
  it('requires 85% confidence, no rejection cause and every asserted field', () => {
    expect(
      firstPassAccepted({
        causes: [],
        mismatchedFields: [],
        confidence: 0.85,
        minConfidence: 0.85,
      }),
    ).toBe(true)
    expect(
      firstPassAccepted({
        causes: [],
        mismatchedFields: [],
        confidence: 0.84,
        minConfidence: 0.85,
      }),
    ).toBe(false)
    expect(
      firstPassAccepted({
        causes: ['low_confidence'],
        mismatchedFields: [],
        confidence: 0.9,
        minConfidence: 0.85,
      }),
    ).toBe(false)
  })
})
