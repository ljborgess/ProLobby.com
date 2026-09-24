import { matchArchetype } from './archetypes'
import { ATTRIBUTE_VALUE_WINDOW, MIN_LANGUAGE_HITS } from './constants'
import { attributeStems, foldAccents } from './labels'
import type { AttributeKey, ExtractedFields, GameLanguage, OcrWord } from './types'

export type ParseOutcome = {
  fields: ExtractedFields
  language: GameLanguage | null
  languageHits: Record<GameLanguage, number>
}

export function normalizeOcrText(text: string): string {
  return text
    .replace(/\u2026/g, '')
    .replace(/\.{2,}/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .trim()
}

/**
 * After a label, the Attributes row shows the current value plus a MIN–MAX
 * range and a signed body-modifier (`−5`, `+5`). Those extras are not the
 * stat. Only the same line (or the next one) is eligible — looking further
 * would let a group header steal the next row's number.
 */
export function readAttributeValue(window: string): number | null {
  const lines = window.split('\n')
  return extractNumber(lines[0] ?? '') ?? extractNumber(lines[1] ?? '')
}

function extractNumber(chunk: string): number | null {
  const cleaned = chunk
    .replace(/[+\-−–]\s*\d{1,2}\b/g, ' ')
    .replace(/\b\d{2}\s*[-–—]\s*\d{2}\b/g, ' ')
  const match = cleaned.match(/\b(\d{1,2})\b/)
  if (!match || match[1] === undefined) {
    return null
  }
  const value = Number(match[1])
  if (value < 1 || value > 99) {
    return null
  }
  return value
}

function overlaps(used: Array<[number, number]>, start: number, end: number): boolean {
  return used.some(([from, to]) => start < to && end > from)
}

export function parseOcrText(text: string): ParseOutcome {
  const normalized = normalizeOcrText(text)
  const search = foldAccents(normalized).toLowerCase()
  const stems = attributeStems()
    .map((item) => ({ ...item, folded: foldAccents(item.stem).toLowerCase() }))
    .sort((a, b) => b.folded.length - a.folded.length)

  const used: Array<[number, number]> = []
  const attributes: Partial<Record<AttributeKey, number>> = {}
  const languageHits: Record<GameLanguage, number> = { pt: 0, es: 0, en: 0 }

  for (const item of stems) {
    if (attributes[item.key] !== undefined) {
      continue
    }
    let from = 0
    while (from < search.length) {
      const idx = search.indexOf(item.folded, from)
      if (idx === -1) {
        break
      }
      const end = idx + item.folded.length
      if (overlaps(used, idx, end)) {
        from = idx + 1
        continue
      }
      const window = normalized.slice(end, end + ATTRIBUTE_VALUE_WINDOW)
      const value = readAttributeValue(window)
      if (value === null) {
        from = idx + 1
        continue
      }
      attributes[item.key] = value
      languageHits[item.language] += 1
      used.push([idx, end])
      break
    }
  }

  return {
    fields: {
      overall: null,
      gamertag: null,
      position: null,
      archetype: null,
      attributes,
    },
    language: pickLanguage(languageHits),
    languageHits,
  }
}

export type ArchetypeParseOutcome = {
  fields: ExtractedFields
  language: GameLanguage | null
  fieldConfidence: number | null
}

// Only English labels have been seen on real prints; PT/ES are still unknown.
const ARCHETYPE_SCREEN_LABELS_EN = [
  'archetypes',
  'keeper',
  'defender',
  'midfielder',
  'forward',
  'playstyles',
  'inspired',
]

/**
 * Reads the archetype from the full screen, where its big title is the
 * clearest text. The gamertag is not here: the card text is too small for a
 * full-screen pass, so it is checked separately on an upscaled crop (card.ts).
 */
export function parseArchetypeScreen(text: string, words: OcrWord[]): ArchetypeParseOutcome {
  const lines = normalizeOcrText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')

  const hits = new Map<string, number[]>()
  lines.forEach((line, index) => {
    const name =
      matchArchetype(line) ??
      line
        .split(' ')
        .map(matchArchetype)
        .find((m) => m !== null) ??
      null
    if (name) {
      hits.set(name, [...(hits.get(name) ?? []), index])
    }
  })
  const archetype = [...hits.entries()].sort((a, b) => b[1].length - a[1].length)[0]?.[0] ?? null

  const labelHits = ARCHETYPE_SCREEN_LABELS_EN.filter((label) =>
    text.toLowerCase().includes(label),
  ).length
  const language: GameLanguage | null = labelHits >= MIN_LANGUAGE_HITS ? 'en' : null

  return {
    fields: { overall: null, gamertag: null, position: null, archetype, attributes: {} },
    language,
    fieldConfidence: archetypeConfidence(words, archetype),
  }
}

function archetypeConfidence(words: OcrWord[], archetype: string | null): number | null {
  if (archetype === null) {
    return null
  }
  const tokens = new Set(archetype.split(' '))
  const matched = words.filter((word) => tokens.has(word.text.toLowerCase().replace(/[^a-z]/g, '')))
  if (matched.length === 0) {
    return null
  }
  return matched.reduce((sum, word) => sum + word.confidence, 0) / matched.length
}

export function pickLanguage(hits: Record<GameLanguage, number>): GameLanguage | null {
  const ranked = (Object.entries(hits) as Array<[GameLanguage, number]>).sort((a, b) => b[1] - a[1])
  const best = ranked[0]
  const second = ranked[1]
  if (!best || best[1] < MIN_LANGUAGE_HITS) {
    return null
  }
  if (second && second[1] === best[1]) {
    return null
  }
  return best[0]
}
