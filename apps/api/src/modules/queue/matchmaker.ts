import { CharacterCategory } from '../character/archetype'
import { reputationBand } from '../ranking/reputation.service'

/** docs/produto/03-partida/02-fila.md — #230. */
export const SLOTS_PER_SIDE: Readonly<Record<CharacterCategory, number>> = {
  [CharacterCategory.GOALKEEPER]: 1,
  [CharacterCategory.DEFENDER]: 4,
  [CharacterCategory.MIDFIELDER]: 2,
  [CharacterCategory.WINGER]: 2,
  [CharacterCategory.STRIKER]: 2,
}
export const MIN_HUMANS_PER_SIDE = 4
export const BAND_START = 150
export const BAND_STEP = 50
export const BAND_STEP_MS = 2 * 60 * 1000
export const BAND_MAX = 400

export interface Candidate {
  /** The queue entry. */
  id: string
  category: CharacterCategory
  /** Frozen at entry (RF-003). */
  elo: number
  joinedAt: Date
  reputation: number
  /** Declared free club slots, null with no club declared (RF-006). */
  freeSlots: number | null
}

export type MatchResult =
  | { kind: 'match'; sides: [Candidate[], Candidate[]] }
  | {
      kind: 'wait'
      /** Categories with someone waiting and no pair for them (RF-007). */
      unpaired: CharacterCategory[]
      /** Enough pairs, but a side has nobody whose club fits it (RF-007). */
      captainMissing: boolean
    }

/** ±150, +50 every 2 minutes of search, at most ±400 (RF-003). */
export function bandOf(candidate: Candidate, now: Date): number {
  const steps = Math.floor((now.getTime() - candidate.joinedAt.getTime()) / BAND_STEP_MS)
  return Math.min(BAND_START + BAND_STEP * Math.max(steps, 0), BAND_MAX)
}

/**
 * The first lobby the queue can close now, or what keeps it from closing.
 * Pure: the caller passes the entries and the clock, and runs it again on
 * what is left to form the next lobby.
 *
 * Decided 2026-10-06: the lobby closes as soon as the floor, symmetry and a
 * captain per side hold — it does not hold people to gather more. With that,
 * the 8-minute symmetry relief has nothing left to relieve: a category
 * without a pair never blocks, its people just wait for the next lobby.
 *
 * Pairs are category against category (RF-004), one member per side. Two
 * people pair when their elo gap fits the wider of their two bands, so the
 * band that grew with the wait is the one that unlocks the pair. Priority is
 * good reputation first (under 55 the queue is slower, #208), then time in
 * the queue.
 *
 * ponytail: greedy pairing in priority order, not an optimal assignment;
 * fine for a queue of tens, revisit if lobbies close with pairs left on the
 * table at a few hundred.
 */
export function findMatch(candidates: readonly Candidate[], now: Date): MatchResult {
  const pairs: [Candidate, Candidate][] = []
  const unpaired: CharacterCategory[] = []

  for (const category of Object.values(CharacterCategory)) {
    const waiting = candidates.filter((c) => c.category === category).sort(byPriority)
    const used = new Set<string>()
    let formed = 0
    for (const first of waiting) {
      if (used.has(first.id) || formed === SLOTS_PER_SIDE[category]) continue
      const second = waiting.find(
        (other) =>
          other !== first &&
          !used.has(other.id) &&
          Math.abs(first.elo - other.elo) <= Math.max(bandOf(first, now), bandOf(other, now)),
      )
      if (!second) continue
      used.add(first.id).add(second.id)
      pairs.push([first, second])
      formed += 1
    }
    if (waiting.some((c) => !used.has(c.id)) && formed < SLOTS_PER_SIDE[category]) {
      unpaired.push(category)
    }
  }

  pairs.sort((a, b) => byPriority(worse(a), worse(b)))
  for (let size = pairs.length; size >= MIN_HUMANS_PER_SIDE; size -= 1) {
    const sides = withCaptains(pairs, size)
    if (sides) return { kind: 'match', sides }
  }
  return {
    kind: 'wait',
    unpaired,
    captainMissing: pairs.length >= MIN_HUMANS_PER_SIDE,
  }
}

/**
 * `size` pairs split into two sides, each with someone whose club takes the
 * other humans of the side (RF-006: free slots ≥ humans − 1), or null. The
 * captains' pairs go in first, the rest by priority.
 */
function withCaptains(
  pairs: readonly [Candidate, Candidate][],
  size: number,
): [Candidate[], Candidate[]] | null {
  const fits = (c: Candidate) => c.freeSlots !== null && c.freeSlots >= size - 1
  const sideA: Candidate[] = []
  const sideB: Candidate[] = []

  // One pair with two fitting members covers both sides; else two pairs,
  // each sending its fitting member to a different side.
  const both = pairs.find(([a, b]) => fits(a) && fits(b))
  let chosen: (readonly [Candidate, Candidate])[]
  if (both) {
    chosen = [both]
    sideA.push(both[0])
    sideB.push(both[1])
  } else {
    chosen = pairs.filter(([a, b]) => fits(a) || fits(b)).slice(0, 2)
    const [first, second] = chosen
    if (!first || !second) return null
    const [captainA, otherA] = fits(first[0]) ? first : [first[1], first[0]]
    const [captainB, otherB] = fits(second[0]) ? second : [second[1], second[0]]
    sideA.push(captainA, otherB)
    sideB.push(captainB, otherA)
  }

  // Alternate which side gets the higher elo of each pair, so neither side
  // collects every stronger half.
  const rest = pairs.filter((pair) => !chosen.includes(pair)).slice(0, size - chosen.length)
  rest.forEach(([a, b], index) => {
    const [high, low] = a.elo >= b.elo ? [a, b] : [b, a]
    const aGetsHigh = index % 2 === 0
    sideA.push(aGetsHigh ? high : low)
    sideB.push(aGetsHigh ? low : high)
  })
  return [sideA, sideB]
}

function byPriority(a: Candidate, b: Candidate): number {
  const slow = (c: Candidate) => (reputationBand(c.reputation) === 'good' ? 0 : 1)
  return slow(a) - slow(b) || a.joinedAt.getTime() - b.joinedAt.getTime()
}

function worse([a, b]: [Candidate, Candidate]): Candidate {
  return byPriority(a, b) > 0 ? a : b
}
