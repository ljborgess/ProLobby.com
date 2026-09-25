import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { cardTextCrops, foldGamertag, gamertagAppears, impostorVariants } from './card'
import { MIN_ACCEPT_CONFIDENCE } from './constants'
import type { OcrEngine } from './engine'
import { parseGabarito } from './gabarito'
import { sha256Hex } from './hash'
import { inspectImage } from './image-format'
import { firstPassAccepted, matchFields } from './match'
import { parseArchetypeScreen, parseOcrText } from './parse'
import { aggregateReport } from './report'
import type {
  Gabarito,
  GabaritoEntry,
  ImpostorCheck,
  PilotReport,
  PrintMeasurement,
  RejectionCause,
} from './types'

export type MeasureDeps = {
  engine: OcrEngine
  readFile?: (filePath: string) => Promise<Buffer>
}

/**
 * Walks a gabarito against a folder of prints. Never writes the image, never
 * talks to the API, and never looks up a person — the gabarito is the only
 * labelled source of identity, and even then only as expected field values.
 */
export async function measurePilot(
  gabarito: Gabarito,
  printsDir: string,
  deps: MeasureDeps,
): Promise<PilotReport> {
  const read = deps.readFile ?? ((filePath: string) => readFile(filePath))
  const seenHashes = new Map<string, string>()
  const cardLines = new Map<string, string[]>()
  const prints: PrintMeasurement[] = []

  for (const entry of gabarito.entries) {
    prints.push(await measureEntry(entry, printsDir, deps.engine, read, seenHashes, cardLines))
  }

  return aggregateReport(deps.engine.id, prints, checkImpostors(gabarito, cardLines))
}

export async function measurePilotFromJson(
  gabaritoJson: unknown,
  printsDir: string,
  deps: MeasureDeps,
): Promise<PilotReport> {
  return measurePilot(parseGabarito(gabaritoJson), printsDir, deps)
}

async function readCardLines(engine: OcrEngine, image: Buffer): Promise<string[]> {
  const lines: string[] = []
  for (const crop of await cardTextCrops(image)) {
    const { text } = await engine.recognize(crop.image, { psm: crop.psm })
    lines.push(...text.split('\n').filter((line) => line.trim() !== ''))
  }
  return lines
}

/**
 * Every card is also checked against the *other* players' gamertags in the
 * gabarito. A hit there is an impostor the tolerance would let through; the
 * rule since 2026-09-24 is that this count stays at zero.
 */
function checkImpostors(gabarito: Gabarito, cardLines: Map<string, string[]>): ImpostorCheck {
  const tags = [
    ...new Set(
      gabarito.entries.flatMap((entry) =>
        entry.expected.gamertag ? [entry.expected.gamertag] : [],
      ),
    ),
  ]
  const result: ImpostorCheck = { checks: 0, falseAccepts: 0 }
  for (const entry of gabarito.entries) {
    const lines = cardLines.get(entry.id)
    const own = entry.expected.gamertag
    if (!lines || !own) {
      continue
    }
    const others = tags.filter((tag) => foldGamertag(tag) !== foldGamertag(own))
    for (const tag of [...others, ...impostorVariants(own)]) {
      result.checks += 1
      if (gamertagAppears(tag, lines)) {
        result.falseAccepts += 1
      }
    }
  }
  return result
}

/**
 * Gabarito `file` is a name inside the prints folder, never a path that
 * climbs out of it. The operator writes the gabarito, but a `../.env`
 * typo (or a copied-from-somewhere entry) must not become a file read.
 */
export function resolvePrintPath(printsDir: string, file: string): string | null {
  if (file === '' || path.isAbsolute(file)) {
    return null
  }
  const parts = file.split(/[\\/]/)
  if (parts.some((part) => part === '..')) {
    return null
  }
  const root = path.resolve(printsDir)
  const resolved = path.resolve(root, file)
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    return null
  }
  return resolved
}

async function measureEntry(
  entry: GabaritoEntry,
  printsDir: string,
  engine: OcrEngine,
  read: (filePath: string) => Promise<Buffer>,
  seenHashes: Map<string, string>,
  cardLines: Map<string, string[]>,
): Promise<PrintMeasurement> {
  const filePath = resolvePrintPath(printsDir, entry.file)
  const base: PrintMeasurement = {
    id: entry.id,
    file: entry.file,
    edition: entry.edition,
    languageExpected: entry.language,
    languageDetected: null,
    origin: entry.origin,
    capture: entry.capture,
    accepted: false,
    confidence: null,
    causes: [],
    extracted: null,
    mismatchedFields: [],
    sha256: null,
  }

  if (!filePath) {
    return { ...base, causes: ['invalid_format'] }
  }

  let bytes: Buffer
  try {
    bytes = await read(filePath)
  } catch {
    return { ...base, causes: ['invalid_format'] }
  }

  const inspection = inspectImage(bytes)
  if (!inspection.ok) {
    return { ...base, causes: ['invalid_format'] }
  }

  const digest = sha256Hex(bytes)
  base.sha256 = digest
  const firstOwner = seenHashes.get(digest)
  if (firstOwner) {
    return { ...base, causes: ['print_already_used'] }
  }
  seenHashes.set(digest, entry.id)

  const ocr = await engine.recognize(bytes)
  const parsed =
    entry.screen === 'archetypes'
      ? parseArchetypeScreen(ocr.text, ocr.words)
      : parseOcrText(ocr.text)
  // On the Archetypes screen most text is menus and descriptions; only the
  // words that became fields say whether the read can be trusted.
  const confidence =
    'fieldConfidence' in parsed && parsed.fieldConfidence !== null
      ? parsed.fieldConfidence
      : ocr.confidence
  // The gabarito's gamertag stands in for the one the player typed at sign-up:
  // the product verifies a claim, it doesn't transcribe a stranger's tag.
  if (entry.screen === 'archetypes' && entry.expected.gamertag !== null) {
    const lines = await readCardLines(engine, bytes)
    cardLines.set(entry.id, lines)
    parsed.fields.gamertag = gamertagAppears(entry.expected.gamertag, lines)
      ? entry.expected.gamertag
      : null
  }
  const matched = matchFields(entry.expected, parsed.fields)
  const causes: RejectionCause[] = []
  if (parsed.language === null) {
    causes.push('unrecognized_language')
  }
  if (confidence < MIN_ACCEPT_CONFIDENCE) {
    causes.push('low_confidence')
  }
  if (matched.gamertagMismatch) {
    causes.push('gamertag_mismatch')
  }

  return {
    ...base,
    languageDetected: parsed.language,
    accepted: firstPassAccepted({
      causes,
      mismatchedFields: matched.mismatchedFields,
      confidence,
      minConfidence: MIN_ACCEPT_CONFIDENCE,
    }),
    confidence,
    causes,
    // Never the tag itself: reports stay free of real gamertags, and
    // mismatchedFields already says whether it verified.
    extracted: { ...parsed.fields, gamertag: null },
    mismatchedFields: matched.mismatchedFields,
  }
}
