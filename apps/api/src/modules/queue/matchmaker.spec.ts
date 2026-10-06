import { CharacterCategory } from '../character/archetype'
import { bandOf, type Candidate, findMatch } from './matchmaker'

const NOW = new Date('2026-10-06T20:00:00Z')
const MINUTE = 60 * 1000
let seq = 0

function player(
  category: CharacterCategory,
  overrides: Partial<Omit<Candidate, 'category'>> = {},
): Candidate {
  seq += 1
  return {
    id: `p${seq}`,
    category,
    elo: 1000,
    joinedAt: new Date(NOW.getTime() - seq * 1000),
    reputation: 70,
    freeSlots: null,
    ...overrides,
  }
}

const pair = (category: CharacterCategory, overrides = {}) => [
  player(category, overrides),
  player(category, overrides),
]
const captain = (category: CharacterCategory, freeSlots = 10) => player(category, { freeSlots })

/** Four pairs with a captain on each side: the smallest lobby that closes. */
function eight(): Candidate[] {
  return [
    captain(CharacterCategory.MIDFIELDER),
    captain(CharacterCategory.MIDFIELDER),
    ...pair(CharacterCategory.GOALKEEPER),
    ...pair(CharacterCategory.DEFENDER),
    ...pair(CharacterCategory.STRIKER),
  ]
}

const ids = (sides: [Candidate[], Candidate[]]) => sides.flat().map((c) => c.id)

describe('findMatch (#230)', () => {
  it('closes with 8 compatible humans and none with 7 (RF-005)', () => {
    const all = eight()

    const closed = findMatch(all, NOW)
    const open = findMatch(all.slice(0, 7), NOW)

    expect(closed.kind).toBe('match')
    if (closed.kind === 'match') {
      expect(closed.sides[0]).toHaveLength(4)
      expect(closed.sides[1]).toHaveLength(4)
    }
    expect(open.kind).toBe('wait')
  })

  it('puts the same categories on both sides, not just the same count (RF-004)', () => {
    const lopsided = [
      ...Array.from({ length: 4 }, () => captain(CharacterCategory.DEFENDER)),
      player(CharacterCategory.GOALKEEPER),
      player(CharacterCategory.MIDFIELDER),
      player(CharacterCategory.STRIKER),
      player(CharacterCategory.STRIKER),
    ]

    const result = findMatch(lopsided, NOW)

    expect(result).toEqual({
      kind: 'wait',
      unpaired: [CharacterCategory.GOALKEEPER, CharacterCategory.MIDFIELDER],
      captainMissing: false,
    })
  })

  it('fills a side category by category and leaves the excess waiting', () => {
    const all = [
      ...eight(),
      player(CharacterCategory.GOALKEEPER),
      player(CharacterCategory.GOALKEEPER),
    ]

    const result = findMatch(all, NOW)

    expect(result.kind).toBe('match')
    if (result.kind === 'match') {
      const keepers = result.sides.map(
        (side) => side.filter((c) => c.category === CharacterCategory.GOALKEEPER).length,
      )
      expect(keepers).toEqual([1, 1])
    }
  })

  it('opens the band 50 every 2 minutes, up to 400 (RF-003)', () => {
    const at = (minutes: number) =>
      player(CharacterCategory.STRIKER, {
        joinedAt: new Date(NOW.getTime() - minutes * MINUTE),
      })

    expect(bandOf(at(0), NOW)).toBe(150)
    expect(bandOf(at(3.9), NOW)).toBe(200)
    expect(bandOf(at(10), NOW)).toBe(400)
    expect(bandOf(at(30), NOW)).toBe(400)
  })

  it('pairs outside the starting band once the wider band reaches it', () => {
    const base = eight().filter((c) => c.category !== CharacterCategory.STRIKER)
    const fresh = player(CharacterCategory.STRIKER, { elo: 1000, joinedAt: NOW })
    const far = (minutes: number) =>
      player(CharacterCategory.STRIKER, {
        elo: 1300,
        joinedAt: new Date(NOW.getTime() - minutes * MINUTE),
      })

    expect(findMatch([...base, fresh, far(0)], NOW).kind).toBe('wait')
    expect(findMatch([...base, fresh, far(10)], NOW).kind).toBe('match')
  })

  it('does not close without a captain on each side, and says so (RF-006)', () => {
    const noClub = [
      ...pair(CharacterCategory.MIDFIELDER),
      ...pair(CharacterCategory.GOALKEEPER),
      ...pair(CharacterCategory.DEFENDER),
      ...pair(CharacterCategory.STRIKER),
    ]

    expect(findMatch(noClub, NOW)).toEqual({ kind: 'wait', unpaired: [], captainMissing: true })
  })

  it('needs free slots for the other humans of the side, not just one (RF-006)', () => {
    const all = eight().map((c) => (c.freeSlots === null ? c : { ...c, freeSlots: 2 }))

    expect(findMatch(all, NOW).kind).toBe('wait')
    expect(
      findMatch(
        all.map((c) => (c.freeSlots === null ? c : { ...c, freeSlots: 3 })),
        NOW,
      ).kind,
    ).toBe('match')
  })

  it('puts captains from two different pairs on opposite sides', () => {
    const all = [
      captain(CharacterCategory.MIDFIELDER),
      player(CharacterCategory.MIDFIELDER),
      captain(CharacterCategory.GOALKEEPER),
      player(CharacterCategory.GOALKEEPER),
      ...pair(CharacterCategory.DEFENDER),
      ...pair(CharacterCategory.STRIKER),
    ]

    const result = findMatch(all, NOW)

    expect(result.kind).toBe('match')
    if (result.kind === 'match') {
      for (const side of result.sides) {
        expect(side.some((c) => c.freeSlots !== null)).toBe(true)
      }
    }
  })

  it('gives the spot to reputation 55 or more over an older entry under 55', () => {
    const base = eight().filter((c) => c.category !== CharacterCategory.STRIKER)
    const slowOld = player(CharacterCategory.STRIKER, {
      reputation: 50,
      joinedAt: new Date(NOW.getTime() - 9 * MINUTE),
    })
    const goodA = player(CharacterCategory.STRIKER, { joinedAt: NOW })
    const goodB = player(CharacterCategory.STRIKER, { joinedAt: NOW })
    const goodC = player(CharacterCategory.STRIKER, { joinedAt: NOW })
    const goodD = player(CharacterCategory.STRIKER, { joinedAt: NOW })

    const result = findMatch([...base, slowOld, goodA, goodB, goodC, goodD], NOW)

    expect(result.kind).toBe('match')
    if (result.kind === 'match') {
      expect(ids(result.sides)).not.toContain(slowOld.id)
    }
  })

  it('breaks ties by time in the queue', () => {
    const base = eight().filter((c) => c.category !== CharacterCategory.STRIKER)
    const strikers = [10, 8, 6].map((minutes) =>
      player(CharacterCategory.STRIKER, { joinedAt: new Date(NOW.getTime() - minutes * MINUTE) }),
    )

    const result = findMatch([...base, ...strikers], NOW)

    expect(result.kind).toBe('match')
    if (result.kind === 'match') {
      expect(ids(result.sides)).toEqual(expect.arrayContaining([strikers[0]!.id, strikers[1]!.id]))
      expect(ids(result.sides)).not.toContain(strikers[2]!.id)
    }
  })
})
