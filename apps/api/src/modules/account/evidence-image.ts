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
