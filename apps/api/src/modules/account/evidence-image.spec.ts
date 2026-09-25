import { detectRealImageType, readImageSize } from './evidence-image'

const JPG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const WEBP_HEADER = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from('WEBP', 'ascii'),
])

describe('detectRealImageType', () => {
  it('recognises a real JPG by its magic bytes', () => {
    expect(detectRealImageType(JPG_HEADER)).toBe('jpg')
  })

  it('recognises a real PNG by its magic bytes', () => {
    expect(detectRealImageType(PNG_HEADER)).toBe('png')
  })

  it('recognises a real WEBP by its RIFF/WEBP markers', () => {
    expect(detectRealImageType(WEBP_HEADER)).toBe('webp')
  })

  it('rejects a file renamed to look like an image (item 16)', () => {
    const phpDisguisedAsJpg = Buffer.from('<?php system($_GET["c"]); ?>')
    expect(detectRealImageType(phpDisguisedAsJpg)).toBeNull()
  })

  it('rejects a buffer too short to hold any signature', () => {
    expect(detectRealImageType(Buffer.from([0xff, 0xd8]))).toBeNull()
  })

  it('rejects RIFF audio (WAV shares the RIFF prefix with WEBP)', () => {
    const wav = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from('WAVE', 'ascii'),
    ])
    expect(detectRealImageType(wav)).toBeNull()
  })
})

describe('readImageSize', () => {
  it('reads PNG width and height from the header', () => {
    const png = Buffer.alloc(24)
    png.write('IHDR', 12)
    png.writeUInt32BE(926, 16)
    png.writeUInt32BE(521, 20)
    expect(readImageSize(png, 'png')).toEqual({ width: 926, height: 521 })
  })

  it('does not trust a PNG size outside an IHDR chunk', () => {
    const png = Buffer.alloc(24)
    png.write('tEXt', 12)
    png.writeUInt32BE(926, 16)
    expect(readImageSize(png, 'png')).toBeNull()
  })

  it('finds the JPEG start-of-frame after other segments', () => {
    const jpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x02, 0x09,
      0x03, 0x9e, 0x01, 0x01, 0x11, 0x00, 0xff, 0xd9,
    ])
    expect(readImageSize(jpeg, 'jpg')).toEqual({ width: 926, height: 521 })
  })

  it('skips JPEG fill bytes and markers that carry no length', () => {
    const jpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xff, 0xff, 0xd0, 0xff, 0x01, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x02, 0x09,
      0x03, 0x9e, 0x01, 0x01, 0x11, 0x00, 0xff, 0xd9,
    ])
    expect(readImageSize(jpeg, 'jpg')).toEqual({ width: 926, height: 521 })
  })

  it('reads an extended WEBP header', () => {
    const webp = Buffer.alloc(30)
    webp.write('RIFF', 0)
    webp.write('WEBP', 8)
    webp.write('VP8X', 12)
    webp.writeUIntLE(925, 24, 3)
    webp.writeUIntLE(520, 27, 3)
    expect(readImageSize(webp, 'webp')).toEqual({ width: 926, height: 521 })
  })

  it('answers null for a truncated header', () => {
    expect(readImageSize(Buffer.alloc(10), 'png')).toBeNull()
  })
})
