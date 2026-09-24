import { createWorker } from 'tesseract.js'

import { TesseractEngine } from './tesseract-engine'

jest.mock('tesseract.js', () => ({
  createWorker: jest.fn(),
}))

const mockedCreateWorker = createWorker as jest.MockedFunction<typeof createWorker>
const recognize = jest.fn()
const terminate = jest.fn()
const setParameters = jest.fn()

describe('TesseractEngine', () => {
  beforeEach(() => {
    recognize.mockResolvedValue({
      data: {
        text: 'Acceleration 85',
        confidence: 91,
        words: [{ text: 'Acceleration', confidence: 91 }],
      },
    })
    terminate.mockResolvedValue(undefined)
    setParameters.mockResolvedValue(undefined)
    mockedCreateWorker.mockResolvedValue({
      recognize,
      terminate,
      setParameters,
    } as unknown as Awaited<ReturnType<typeof createWorker>>)
  })

  it('normalizes Tesseract 0–100 confidence to 0–1 and reuses one worker', async () => {
    const engine = new TesseractEngine('/tmp/prolobby-ocr-pilot-cache')
    const first = await engine.recognize(Buffer.from('png'))
    const second = await engine.recognize(Buffer.from('png'))
    expect(first).toEqual({
      text: 'Acceleration 85',
      confidence: 0.91,
      words: [{ text: 'Acceleration', confidence: 0.91 }],
    })
    expect(second.confidence).toBe(0.91)
    expect(mockedCreateWorker).toHaveBeenCalledTimes(1)
    expect(mockedCreateWorker).toHaveBeenCalledWith(
      'eng',
      1,
      expect.objectContaining({ cachePath: '/tmp/prolobby-ocr-pilot-cache', gzip: true }),
    )
    expect(setParameters).toHaveBeenCalledWith({ tessedit_pageseg_mode: '4' })
    await engine.close()
    expect(terminate).toHaveBeenCalledTimes(1)
  })
})
