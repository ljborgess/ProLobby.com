import { ATTRIBUTE_VALUE_WINDOW, MIN_LANGUAGE_HITS } from './constants'
import { attributeStems, foldAccents } from './labels'
import type { AttributeKey, ExtractedFields, GameLanguage } from './types'

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
      attributes,
    },
    language: pickLanguage(languageHits),
    languageHits,
  }
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
