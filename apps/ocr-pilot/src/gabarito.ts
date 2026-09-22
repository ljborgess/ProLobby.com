import { ATTRIBUTE_KEYS } from './types'
import type {
  AttributeKey,
  CaptureKind,
  ExpectedFields,
  Gabarito,
  GabaritoEntry,
  GameEdition,
  GameLanguage,
  PilotScreen,
  PrintOrigin,
} from './types'
import { CAPTURES, EDITIONS, GAME_LANGUAGES, ORIGINS, SCREENS } from './types'

export function parseGabarito(input: unknown): Gabarito {
  if (!isRecord(input)) {
    throw new Error('gabarito must be an object')
  }
  if (input.version !== 1) {
    throw new Error('gabarito.version must be 1')
  }
  if (!Array.isArray(input.entries) || input.entries.length === 0) {
    throw new Error('gabarito.entries must be a non-empty array')
  }
  const ids = new Set<string>()
  const entries = input.entries.map((entry, index) => parseEntry(entry, index, ids))
  return { version: 1, entries }
}

function parseEntry(input: unknown, index: number, ids: Set<string>): GabaritoEntry {
  if (!isRecord(input)) {
    throw new Error(`gabarito.entries[${index}] must be an object`)
  }
  const id = requiredString(input.id, `entries[${index}].id`)
  if (ids.has(id)) {
    throw new Error(`duplicate gabarito id ${id}`)
  }
  ids.add(id)
  const edition = requiredEnum(input.edition, EDITIONS, `entries[${index}].edition`)
  const language = requiredEnum(input.language, GAME_LANGUAGES, `entries[${index}].language`)
  const origin = requiredEnum(input.origin, ORIGINS, `entries[${index}].origin`)
  const capture = requiredEnum(input.capture, CAPTURES, `entries[${index}].capture`)
  const screen = requiredEnum(input.screen, SCREENS, `entries[${index}].screen`)
  return {
    id,
    file: requiredString(input.file, `entries[${index}].file`),
    edition: edition as GameEdition,
    screen: screen as PilotScreen,
    language: language as GameLanguage,
    origin: origin as PrintOrigin,
    capture: capture as CaptureKind,
    expected: parseExpected(input.expected, index, edition as GameEdition),
  }
}

function parseExpected(input: unknown, index: number, edition: GameEdition): ExpectedFields {
  if (!isRecord(input)) {
    throw new Error(`entries[${index}].expected must be an object`)
  }
  const attributes = parseAttributes(input.attributes, index)
  const overall = optionalNumberOrNull(input.overall, `entries[${index}].expected.overall`)
  const gamertag = optionalStringOrNull(input.gamertag, `entries[${index}].expected.gamertag`)
  const position = optionalStringOrNull(input.position, `entries[${index}].expected.position`)

  // FC 27 Attributes tab does not show these — the 2026-09-18 evidence.
  // A gabarito that claims they are on that screen is a labelling error, not
  // an OCR miss, and would inflate the first-pass miss rate for the wrong reason.
  if (edition === 'fc27' && (overall !== null || gamertag !== null)) {
    throw new Error(
      `entries[${index}]: fc27 attributes gabarito must leave overall and gamertag null`,
    )
  }

  return { overall, gamertag, position, attributes }
}

function parseAttributes(input: unknown, index: number): Partial<Record<AttributeKey, number>> {
  if (!isRecord(input)) {
    throw new Error(`entries[${index}].expected.attributes must be an object`)
  }
  const attributes: Partial<Record<AttributeKey, number>> = {}
  const allowed = new Set<string>(ATTRIBUTE_KEYS)
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key)) {
      throw new Error(`entries[${index}].expected.attributes.${key} is not an attribute key`)
    }
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 99) {
      throw new Error(`entries[${index}].expected.attributes.${key} must be an integer 1–99`)
    }
    attributes[key as AttributeKey] = value
  }
  if (Object.keys(attributes).length === 0) {
    throw new Error(`entries[${index}].expected.attributes must list at least one stat`)
  }
  return attributes
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value
}

function requiredEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error(`${label} must be one of ${allowed.join(', ')}`)
  }
  return value as T
}

function optionalNumberOrNull(value: unknown, label: string): number | null {
  if (value === undefined || value === null) {
    return null
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${label} must be an integer or null`)
  }
  return value
}

function optionalStringOrNull(value: unknown, label: string): string | null {
  if (value === undefined || value === null) {
    return null
  }
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string or null`)
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
