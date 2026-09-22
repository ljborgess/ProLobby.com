import type { OcrResult } from './types'

/**
 * The pilot starts on Tesseract (docs/negocio/02-implementacao.md). Google
 * Vision is a later comparison (#50), so the rest of the script talks to this
 * interface and never imports a vendor SDK.
 */
export interface OcrEngine {
  readonly id: string
  recognize(image: Buffer): Promise<OcrResult>
  close(): Promise<void>
}

export class StaticOcrEngine implements OcrEngine {
  readonly id: string

  constructor(
    private readonly result: OcrResult,
    id = 'static',
  ) {
    this.id = id
  }

  async recognize(): Promise<OcrResult> {
    return this.result
  }

  async close(): Promise<void> {
    return
  }
}
