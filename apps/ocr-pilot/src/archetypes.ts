export const ARCHETYPE_GROUPS = ['keeper', 'defender', 'midfielder', 'forward'] as const
export type ArchetypeGroup = (typeof ARCHETYPE_GROUPS)[number]

// FC 27 Clubs, all 13. Group follows the icon row order on the Archetypes
// screen (real prints), not third-party summaries that mix them up.
export const ARCHETYPES: Record<string, ArchetypeGroup> = {
  'shot stopper': 'keeper',
  'sweeper keeper': 'keeper',
  progressor: 'defender',
  boss: 'defender',
  marauder: 'defender',
  disruptor: 'midfielder',
  recycler: 'midfielder',
  maestro: 'midfielder',
  creator: 'midfielder',
  spark: 'forward',
  magician: 'forward',
  finisher: 'forward',
  target: 'forward',
}

export function archetypeGroup(name: string | null): ArchetypeGroup | null {
  return name === null ? null : (ARCHETYPES[name] ?? null)
}

/**
 * Snaps an OCR token to the closest archetype name, tolerating ~1 misread
 * character per 4 (`MAESTR0`, `SPARK+`). Returns null when nothing is close:
 * a free-text guess is worse than a rejection.
 */
export function matchArchetype(token: string): string | null {
  const cleaned = token
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .trim()
  if (cleaned.length < 4) {
    return null
  }
  let best: string | null = null
  let bestDistance = Infinity
  for (const name of Object.keys(ARCHETYPES)) {
    const distance = levenshtein(cleaned, name)
    if (distance < bestDistance) {
      best = name
      bestDistance = distance
    }
  }
  return best !== null && bestDistance <= Math.floor(best.length / 4) ? best : null
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    let prev = row[0] ?? 0
    row[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j] ?? 0
      row[j] = Math.min(current + 1, (row[j - 1] ?? 0) + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = current
    }
  }
  return row[b.length] ?? 0
}
