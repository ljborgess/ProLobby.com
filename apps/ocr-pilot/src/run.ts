import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { cardTextCrops, gamertagAppears } from './card'
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
  const prints: PrintMeasurement[] = []

  for (const entry of gabarito.entries) {
    prints.push(await measureEntry(entry, printsDir, deps.engine, read, seenHashes))
  }

  return aggregateReport(deps.engine.id, prints)
}

export async function measurePilotFromJson(
  gabaritoJson: unknown,
  printsDir: string,
  deps: MeasureDeps,
): Promise<PilotReport> {
  return measurePilot(parseGabarito(gabaritoJson), printsDir, deps)
}

/**
 * Gabarito `file` is a name inside the prints folder, never a path that
 * climbs out of it. The operator writes the gabarito, but a `../.env`
 * typo (or a copied-from-somewhere entry) must not become a file read.
 */
/**
 * The gabarito's gamertag stands in for the one the player typed at sign-up:
 * the product verifies a claim, it doesn't transcribe a stranger's tag.
 */
async function verifyGamertagOnCard(
  engine: OcrEngine,
  image: Buffer,
  claimed: string,
): Promise<boolean> {
  for (const crop of await cardTextCrops(image)) {
    const { text } = await engine.recognize(crop, { psm: '6' })
    if (gamertagAppears(claimed, text.split('\n'))) {
      return true
    }
  }
  return false
}

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
  if (entry.screen === 'archetypes' && entry.expected.gamertag !== null) {
    parsed.fields.gamertag = (await verifyGamertagOnCard(engine, bytes, entry.expected.gamertag))
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
    extracted: parsed.fields,
    mismatchedFields: matched.mismatchedFields,
  }
}
