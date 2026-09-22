import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { MIN_ACCEPT_CONFIDENCE } from './constants'
import type { OcrEngine } from './engine'
import { parseGabarito } from './gabarito'
import { sha256Hex } from './hash'
import { inspectImage } from './image-format'
import { firstPassAccepted, matchFields } from './match'
import { parseOcrText } from './parse'
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

async function measureEntry(
  entry: GabaritoEntry,
  printsDir: string,
  engine: OcrEngine,
  read: (filePath: string) => Promise<Buffer>,
  seenHashes: Map<string, string>,
): Promise<PrintMeasurement> {
  const filePath = path.resolve(printsDir, entry.file)
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
  const parsed = parseOcrText(ocr.text)
  const matched = matchFields(entry.expected, parsed.fields)
  const causes: RejectionCause[] = []
  if (parsed.language === null) {
    causes.push('unrecognized_language')
  }
  if (ocr.confidence < MIN_ACCEPT_CONFIDENCE) {
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
      confidence: ocr.confidence,
      minConfidence: MIN_ACCEPT_CONFIDENCE,
    }),
    confidence: ocr.confidence,
    causes,
    extracted: parsed.fields,
    mismatchedFields: matched.mismatchedFields,
  }
}
