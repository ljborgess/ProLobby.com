import { aggregateReport } from './report'
import type { PrintMeasurement } from './types'

function print(overrides: Partial<PrintMeasurement>): PrintMeasurement {
  return {
    id: 'a',
    file: 'a.png',
    edition: 'fc27',
    languageExpected: 'en',
    languageDetected: 'en',
    origin: 'synthetic',
    capture: 'screenshot',
    accepted: true,
    confidence: 0.9,
    causes: [],
    extracted: null,
    mismatchedFields: [],
    sha256: 'abc',
    ...overrides,
  }
}

describe('aggregateReport', () => {
  it('breaks first-pass rate down by language, origin, capture and edition', () => {
    const report = aggregateReport('tesseract', [
      print({ id: 'en-ok', languageExpected: 'en', accepted: true }),
      print({
        id: 'pt-miss',
        languageExpected: 'pt',
        origin: 'publico-video',
        capture: 'photo',
        accepted: false,
        causes: ['low_confidence'],
      }),
    ])
    expect(report.firstPassAcceptRate).toBe(0.5)
    expect(report.meetsTarget).toBe(false)
    expect(report.byLanguage).toEqual({ en: 1, pt: 0 })
    expect(report.byOrigin).toEqual({ synthetic: 1, 'publico-video': 0 })
    expect(report.byCapture).toEqual({ screenshot: 1, photo: 0 })
    expect(report.rejectionCauses.low_confidence).toBe(1)
    expect(report.rejectionCauses.print_already_used).toBe(0)
  })
})
