// FC 27 Clubs, all 13, in the icon row order of the Archetypes screen (real
// prints): keeper 2, defender 3, midfielder 4, forward 4.
export const ARCHETYPES: readonly string[] = [
  'shot stopper',
  'sweeper keeper',
  'progressor',
  'boss',
  'marauder',
  'disruptor',
  'recycler',
  'maestro',
  'creator',
  'spark',
  'magician',
  'finisher',
  'target',
]

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
  for (const name of ARCHETYPES) {
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
