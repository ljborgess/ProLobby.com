import { MAX_IMAGE_BYTES, MIN_IMAGE_HEIGHT, MIN_IMAGE_WIDTH } from './constants'

export type ImageKind = 'png' | 'jpeg' | 'webp'

export type ImageInspection = {
  ok: true
  kind: ImageKind
  width: number
  height: number
  bytes: number
}

export type ImageRejection = {
  ok: false
  reason: 'too_large' | 'unrecognized' | 'too_small' | 'truncated'
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export function inspectImage(bytes: Buffer): ImageInspection | ImageRejection {
  if (bytes.length > MAX_IMAGE_BYTES) {
    return { ok: false, reason: 'too_large' }
  }
  const kind = sniffKind(bytes)
  if (!kind) {
    return { ok: false, reason: 'unrecognized' }
  }
  const size = readSize(kind, bytes)
  if (!size) {
    return { ok: false, reason: 'truncated' }
  }
  if (size.width < MIN_IMAGE_WIDTH || size.height < MIN_IMAGE_HEIGHT) {
    return { ok: false, reason: 'too_small' }
  }
  return { ok: true, kind, width: size.width, height: size.height, bytes: bytes.length }
}

export function sniffKind(bytes: Buffer): ImageKind | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(PNG_SIG)) {
    return 'png'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg'
  }
  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp'
  }
  return null
}

function readSize(kind: ImageKind, bytes: Buffer): { width: number; height: number } | null {
  if (kind === 'png') {
    return readPngSize(bytes)
  }
  if (kind === 'jpeg') {
    return readJpegSize(bytes)
  }
  return readWebpSize(bytes)
}

export function readPngSize(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 24) {
    return null
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

export function readJpegSize(bytes: Buffer): { width: number; height: number } | null {
  let offset = 2
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      return null
    }
    const marker = bytes[offset + 1]
    if (marker === undefined) {
      return null
    }
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2
      continue
    }
    const size = bytes.readUInt16BE(offset + 2)
    if (size < 2) {
      return null
    }
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    if (isSof) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) }
    }
    offset += 2 + size
  }
  return null
}

export function readWebpSize(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 30) {
    return null
  }
  const kind = bytes.toString('ascii', 12, 16)
  if (kind === 'VP8X') {
    return {
      width: 1 + bytes.readUIntLE(24, 3),
      height: 1 + bytes.readUIntLE(27, 3),
    }
  }
  if (kind === 'VP8 ' && bytes.length >= 30) {
    const width = bytes.readUInt16LE(26) & 0x3fff
    const height = bytes.readUInt16LE(28) & 0x3fff
    return { width, height }
  }
  if (kind === 'VP8L' && bytes.length >= 25) {
    const bits = bytes.readUInt32LE(21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  return null
}
