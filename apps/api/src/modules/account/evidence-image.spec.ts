import { detectRealImageType } from './evidence-image'

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
