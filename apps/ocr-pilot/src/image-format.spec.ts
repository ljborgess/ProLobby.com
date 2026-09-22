import { inspectImage, sniffKind } from './image-format'
import { encodeRgbPng } from './png'
import { encodeSyntheticAttributesPng } from './synthetic-image'

function jpegWithSize(width: number, height: number): Buffer {
  const buf = Buffer.alloc(18)
  buf[0] = 0xff
  buf[1] = 0xd8
  buf[2] = 0xff
  buf[3] = 0xc0
  buf.writeUInt16BE(11, 4)
  buf[6] = 8
  buf.writeUInt16BE(height, 7)
  buf.writeUInt16BE(width, 9)
  buf[11] = 1
  buf[12] = 1
  buf[13] = 0x11
  buf[14] = 0
  buf[15] = 0xff
  buf[16] = 0xd9
  return buf
}

function webpVp8x(width: number, height: number): Buffer {
  const buf = Buffer.alloc(30)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(22, 4)
  buf.write('WEBP', 8)
  buf.write('VP8X', 12)
  buf.writeUInt32LE(10, 16)
  buf.writeUIntLE(width - 1, 24, 3)
  buf.writeUIntLE(height - 1, 27, 3)
  return buf
}

describe('inspectImage', () => {
  it('accepts the synthetic 800×600 PNG fixture', () => {
    const png = encodeSyntheticAttributesPng()
    const inspection = inspectImage(png)
    expect(inspection).toEqual(
      expect.objectContaining({ ok: true, kind: 'png', width: 800, height: 600 }),
    )
    expect(sniffKind(png)).toBe('png')
  })

  it('rejects a PNG below 800×600 before any OCR call', () => {
    const rgb = Buffer.alloc(10 * 10 * 3)
    const png = encodeRgbPng(10, 10, rgb)
    expect(inspectImage(png)).toEqual({ ok: false, reason: 'too_small' })
  })

  it('rejects bytes that are not png, jpeg or webp', () => {
    expect(inspectImage(Buffer.from('not an image'))).toEqual({
      ok: false,
      reason: 'unrecognized',
    })
  })

  it('reads jpeg and webp canvas size from the header', () => {
    expect(inspectImage(jpegWithSize(1280, 720))).toEqual(
      expect.objectContaining({ ok: true, kind: 'jpeg', width: 1280, height: 720 }),
    )
    expect(inspectImage(webpVp8x(1920, 1080))).toEqual(
      expect.objectContaining({ ok: true, kind: 'webp', width: 1920, height: 1080 }),
    )
  })
})
