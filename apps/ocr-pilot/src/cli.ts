import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { measurePilotFromJson } from './run'
import { TesseractEngine } from './tesseract-engine'

/**
 * Isolated measurement CLI — #120.
 *
 *   node dist/cli.js --prints ./prints --gabarito ./gabarito.json [--out ./report.json]
 *
 * Real Virtual Pro prints stay in `prints/` (gitignored). This process has no
 * database, no HTTP server, and no import path into the product apps.
 */
export function parseCliArgs(argv: string[]): {
  prints: string
  gabarito: string
  out: string | null
  engine: 'tesseract'
  help: boolean
} {
  const args = {
    prints: './prints',
    gabarito: './gabarito.json',
    out: null as string | null,
    engine: 'tesseract' as const,
    help: false,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--help' || token === '-h') {
      args.help = true
      continue
    }
    const next = argv[i + 1]
    if (token === '--prints' && next) {
      args.prints = next
      i += 1
      continue
    }
    if (token === '--gabarito' && next) {
      args.gabarito = next
      i += 1
      continue
    }
    if (token === '--out' && next) {
      args.out = next
      i += 1
      continue
    }
    if (token === '--engine' && next) {
      if (next !== 'tesseract') {
        throw new Error(
          'only the tesseract engine is wired; Google Vision was dropped for cost (2026-09-24)',
        )
      }
      i += 1
      continue
    }
  }
  return args
}

export function helpText(): string {
  return [
    'Usage: node dist/cli.js --prints <dir> --gabarito <file> [--out report.json]',
    '',
    'Isolated OCR pilot (#120). Reads a folder of prints against a versioned',
    'gabarito and prints first-pass accept rate, broken down by language,',
    'origin, capture and edition. Images are never written back.',
  ].join('\n')
}

export async function main(argv = process.argv.slice(2)): Promise<string> {
  const args = parseCliArgs(argv)
  if (args.help) {
    return helpText()
  }
  const raw = JSON.parse(await readFile(path.resolve(args.gabarito), 'utf8')) as unknown
  const engine = new TesseractEngine()
  try {
    const report = await measurePilotFromJson(raw, path.resolve(args.prints), { engine })
    const json = `${JSON.stringify(report, null, 2)}\n`
    if (args.out) {
      await writeFile(path.resolve(args.out), json, 'utf8')
    }
    return json
  } finally {
    await engine.close()
  }
}

if (require.main === module) {
  void main()
    .then((output) => {
      process.stdout.write(output)
      if (!output.endsWith('\n')) {
        process.stdout.write('\n')
      }
    })
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
      process.exit(1)
    })
}
