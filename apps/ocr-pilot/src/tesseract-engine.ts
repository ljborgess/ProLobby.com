import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import { createWorker } from 'tesseract.js'

import type { OcrEngine, RecognizeOptions } from './engine'
import type { OcrResult, OcrWord } from './types'

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>

// PSM 4 measured best on real FC 27 prints; 6 and 11 lose label→value order.
const DEFAULT_PSM = '4'

/**
 * Default motor for #120. Language packs stay on disk under `.tessdata` so the
 * first run needs network and every run after that does not. Product code in
 * `apps/api` / `apps/web` must not import this module.
 */
export class TesseractEngine implements OcrEngine {
  readonly id = 'tesseract'
  private worker: TesseractWorker | null = null
  private psm = DEFAULT_PSM

  constructor(private readonly cacheDir = defaultCacheDir()) {}

  async recognize(image: Buffer, options: RecognizeOptions = {}): Promise<OcrResult> {
    const worker = await this.ensureWorker()
    const psm = options.psm ?? DEFAULT_PSM
    if (psm !== this.psm) {
      await worker.setParameters({
        tessedit_pageseg_mode: psm,
      } as Parameters<TesseractWorker['setParameters']>[0])
      this.psm = psm
    }
    const { data } = await worker.recognize(image)
    const words: OcrWord[] = (data.words ?? []).map((word) => ({
      text: word.text,
      confidence: clamp01((word.confidence ?? 0) / 100),
    }))
    const confidence =
      words.length > 0
        ? words.reduce((sum, word) => sum + word.confidence, 0) / words.length
        : clamp01((data.confidence ?? 0) / 100)
    return { text: data.text ?? '', confidence, words }
  }

  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
    }
  }

  private async ensureWorker(): Promise<TesseractWorker> {
    if (this.worker) {
      return this.worker
    }
    await mkdir(this.cacheDir, { recursive: true })
    const worker = await createWorker('eng', 1, {
      cachePath: this.cacheDir,
      gzip: true,
    })
    await worker.setParameters({
      tessedit_pageseg_mode: DEFAULT_PSM,
    } as Parameters<TesseractWorker['setParameters']>[0])
    this.psm = DEFAULT_PSM
    this.worker = worker
    return worker
  }
}

function defaultCacheDir(): string {
  return process.env.OCR_PILOT_TESSDATA ?? path.join(process.cwd(), '.tessdata')
}

function clamp01(value: number): number {
  if (value < 0) {
    return 0
  }
  if (value > 1) {
    return 1
  }
  return value
}
