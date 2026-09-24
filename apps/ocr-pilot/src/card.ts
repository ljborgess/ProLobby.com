import sharp from 'sharp'

// The archetype card's bottom text band (archetype name, then gamertag) sits
// at the same screen proportions on every FC 27 print seen so far.
const BAND = { left: 0.1, top: 0.71, width: 0.11, height: 0.08 }
const UPSCALE = 4
// 0 = grey only. The gamertag is light grey on a bronze/silver/gold card, so
// no single threshold reads every card tier.
const THRESHOLDS = [0, 120, 150, 180]

export async function cardTextCrops(image: Buffer): Promise<Buffer[]> {
  const { width, height } = await sharp(image).metadata()
  if (!width || !height) {
    return []
  }
  const region = {
    left: Math.round(width * BAND.left),
    top: Math.round(height * BAND.top),
    width: Math.round(width * BAND.width),
    height: Math.round(height * BAND.height),
  }
  return Promise.all(
    THRESHOLDS.map((threshold) => {
      const pipeline = sharp(image)
        .extract(region)
        .resize({ width: region.width * UPSCALE, kernel: 'lanczos3' })
        .grayscale()
        .normalise()
      return (threshold > 0 ? pipeline.threshold(threshold) : pipeline).png().toBuffer()
    }),
  )
}

/**
 * The product checks a gamertag the player already typed; it never has to
 * transcribe one. So a line "matches" when it equals the claim after folding
 * characters OCR confuses on this font (5/S, 0/O, 1/l/I, 8/B) and dropping
 * separators, with one edit of slack.
 */
export function gamertagAppears(claimed: string, lines: string[]): boolean {
  const target = foldGamertag(claimed)
  if (target.length < 3) {
    return false
  }
  // Any run of consecutive words: the icon and card art add junk tokens around
  // the tag, and a tag with spaces ("addictz ant") spans several tokens.
  return lines.some((line) => {
    const tokens = line.split(/\s+/).filter((token) => token !== '')
    for (let start = 0; start < tokens.length; start += 1) {
      for (let end = start + 1; end <= tokens.length; end += 1) {
        const candidate = foldGamertag(tokens.slice(start, end).join(''))
        if (candidate.includes(target) || withinOneEdit(candidate, target)) {
          return true
        }
      }
    }
    return false
  })
}

export function foldGamertag(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s_.-]/g, '')
    .replace(/5/g, 's')
    .replace(/0/g, 'o')
    .replace(/[1i|]/g, 'l')
    .replace(/8/g, 'b')
}

function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) {
    return false
  }
  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1
      j += 1
      continue
    }
    edits += 1
    if (edits > 1) {
      return false
    }
    if (a.length > b.length) {
      i += 1
    } else if (b.length > a.length) {
      j += 1
    } else {
      i += 1
      j += 1
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}
