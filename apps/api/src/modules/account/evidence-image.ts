/**
 * Real file type by magic bytes — item 16 of the security checklist.
 *
 * multer's `fileFilter` only sees the `Content-Type` header and the file
 * name, both of which the client sets. Renaming `shell.php` to `print.jpg`
 * and lying in the header passes that check every time; this reads the
 * bytes the browser cannot fake.
 *
 * Only the three formats the checklist declares — JPG, PNG, WEBP.
 */
export function detectRealImageType(buffer: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buffer.length < 12) {
    return null
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg'
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png'
  }

  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp'
  }

  return null
}

/**
 * Width and height from the file header, without decoding the image — enough
 * for a minimum-size gate (RF-064). Null when the header is truncated.
 */
export function readImageSize(
  buffer: Buffer,
  type: 'jpg' | 'png' | 'webp',
): { width: number; height: number } | null {
  if (type === 'png') {
    return buffer.length >= 24
      ? { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
      : null
  }
  if (type === 'webp') {
    return readWebpSize(buffer)
  }
  return readJpegSize(buffer)
}

function readJpegSize(buffer: Buffer): { width: number; height: number } | null {
  let offset = 2
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      return null
    }
    const marker = buffer[offset + 1] ?? 0
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2
      continue
    }
    const length = buffer.readUInt16BE(offset + 2)
    // Start-of-frame markers carry the size; C4, C8 and CC are other tables.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) }
    }
    if (length < 2) {
      return null
    }
    offset += 2 + length
  }
  return null
}

function readWebpSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 30) {
    return null
  }
  const chunk = buffer.toString('ascii', 12, 16)
  if (chunk === 'VP8X') {
    return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) }
  }
  if (chunk === 'VP8 ') {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff }
  }
  if (chunk === 'VP8L') {
    const bits = buffer.readUInt32LE(21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  return null
}
