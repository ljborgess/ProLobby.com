import { StaticOcrEngine } from './engine'
import { parseGabarito } from './gabarito'
import { sha256Hex } from './hash'
import { measurePilot } from './run'
import { SYNTHETIC_ATTRIBUTES_TEXT, encodeSyntheticAttributesPng } from './synthetic-image'

const png = encodeSyntheticAttributesPng()

const entry = {
  id: 'synthetic-en-01',
  file: 'synthetic-en-01.png',
  edition: 'fc27' as const,
  screen: 'attributes' as const,
  language: 'en' as const,
  origin: 'synthetic' as const,
  capture: 'screenshot' as const,
  expected: {
    overall: null,
    gamertag: null,
    position: null,
    attributes: {
      acceleration: 85,
      sprintSpeed: 88,
      finishing: 76,
      shotPower: 80,
      shortPassing: 82,
      longPassing: 79,
      ballControl: 84,
      dribbling: 87,
      interceptions: 71,
      headingAccuracy: 68,
      standingTackle: 64,
      jumping: 74,
      stamina: 81,
    },
  },
}

const files = new Map<string, Buffer>([['/prints/synthetic-en-01.png', png]])

const readFile = async (filePath: string) => {
  const bytes = files.get(filePath)
  if (!bytes) {
    throw new Error(`missing ${filePath}`)
  }
  return bytes
}

describe('measurePilot', () => {
  it('accepts a first-pass synthetic print at ≥85% with every asserted field', async () => {
    const gabarito = parseGabarito({ version: 1, entries: [entry] })
    const engine = new StaticOcrEngine({
      text: SYNTHETIC_ATTRIBUTES_TEXT,
      confidence: 0.91,
      words: [{ text: 'ACCELERATION', confidence: 0.91 }],
    })
    const report = await measurePilot(gabarito, '/prints', { engine, readFile })
    expect(report.engine).toBe('static')
    expect(report.firstPassAcceptRate).toBe(1)
    expect(report.meetsTarget).toBe(true)
    expect(report.byLanguage.en).toBe(1)
    expect(report.byEdition.fc27).toBe(1)
    expect(report.prints[0]).toEqual(
      expect.objectContaining({
        accepted: true,
        languageDetected: 'en',
        causes: [],
        sha256: sha256Hex(png),
      }),
    )
  })

  it('records low confidence without counting the print as first-pass', async () => {
    const gabarito = parseGabarito({ version: 1, entries: [entry] })
    const engine = new StaticOcrEngine({
      text: SYNTHETIC_ATTRIBUTES_TEXT,
      confidence: 0.4,
      words: [],
    })
    const report = await measurePilot(gabarito, '/prints', { engine, readFile })
    expect(report.prints[0]?.accepted).toBe(false)
    expect(report.prints[0]?.causes).toContain('low_confidence')
    expect(report.rejectionCauses.low_confidence).toBe(1)
    expect(report.meetsTarget).toBe(false)
  })

  it('rejects an unrecognized language when the OCR text has no known stems', async () => {
    const gabarito = parseGabarito({ version: 1, entries: [entry] })
    const engine = new StaticOcrEngine({ text: '????', confidence: 0.99, words: [] })
    const report = await measurePilot(gabarito, '/prints', { engine, readFile })
    expect(report.prints[0]?.causes).toContain('unrecognized_language')
  })

  it('does not call OCR for a reused print — hash is the pre-check', async () => {
    const gabarito = parseGabarito({
      version: 1,
      entries: [entry, { ...entry, id: 'synthetic-en-01-copy', file: 'copy.png' }],
    })
    files.set('/prints/copy.png', png)
    const recognize = jest.fn().mockResolvedValue({
      text: SYNTHETIC_ATTRIBUTES_TEXT,
      confidence: 0.91,
      words: [],
    })
    const engine = {
      id: 'spy',
      recognize,
      close: async () => undefined,
    }
    const report = await measurePilot(gabarito, '/prints', { engine, readFile })
    expect(recognize).toHaveBeenCalledTimes(1)
    expect(report.prints[1]?.causes).toEqual(['print_already_used'])
    expect(report.rejectionCauses.print_already_used).toBe(1)
  })

  it('rejects garbage bytes as invalid_format before OCR', async () => {
    files.set('/prints/bad.bin', Buffer.from('nope'))
    const gabarito = parseGabarito({
      version: 1,
      entries: [{ ...entry, id: 'bad', file: 'bad.bin' }],
    })
    const recognize = jest.fn()
    const report = await measurePilot(gabarito, '/prints', {
      engine: { id: 'spy', recognize, close: async () => undefined },
      readFile,
    })
    expect(recognize).not.toHaveBeenCalled()
    expect(report.prints[0]?.causes).toEqual(['invalid_format'])
  })

  it('records gamertag_mismatch only when the gabarito asserted a gamertag', async () => {
    const gabarito = parseGabarito({
      version: 1,
      entries: [
        {
          ...entry,
          id: 'fc26-home',
          edition: 'fc26',
          expected: { ...entry.expected, overall: 88, gamertag: 'Owner' },
        },
      ],
    })
    const engine = new StaticOcrEngine({
      text: SYNTHETIC_ATTRIBUTES_TEXT,
      confidence: 0.91,
      words: [],
    })
    const report = await measurePilot(gabarito, '/prints', { engine, readFile })
    expect(report.prints[0]?.causes).toContain('gamertag_mismatch')
    expect(report.prints[0]?.mismatchedFields).toEqual(
      expect.arrayContaining(['gamertag', 'overall']),
    )
  })
})
