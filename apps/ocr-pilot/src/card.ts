import sharp from 'sharp'

type Region = { left: number; top: number; width: number; height: number }

export type CardCrop = { image: Buffer; psm: string }

const UPSCALE = 6
// The archetype card's bottom text (archetype name, then gamertag) sits at the
// same screen proportions on every FC 27 print seen so far. The band holds
// both lines (PSM 6); the line crops hold only the gamertag (PSM 7), which is
// what reads underscores ("AIR_PEDRI_8_o"). Its exact height drifts ~0.5%.
const BAND: Region = { left: 0.1, top: 0.71, width: 0.11, height: 0.08 }
const GAMERTAG_LINES: Region[] = [0.745, 0.75, 0.755].map((top) => ({
  left: 0.1,
  top,
  width: 0.12,
  height: 0.035,
}))
// 0 = grey only. The gamertag is light or dark depending on the card tier
// (bronze, silver, gold), so no single threshold reads every card.
const BAND_THRESHOLDS = [0, 120, 150, 180]
const LINE_THRESHOLDS = [0, 120]

export async function cardTextCrops(image: Buffer): Promise<CardCrop[]> {
  const { width, height } = await sharp(image).metadata()
  if (!width || !height) {
    return []
  }
  const jobs = [
    ...BAND_THRESHOLDS.map((threshold) => ({ region: BAND, threshold, psm: '6' })),
    ...GAMERTAG_LINES.flatMap((region) =>
      LINE_THRESHOLDS.map((threshold) => ({ region, threshold, psm: '7' })),
    ),
  ]
  return Promise.all(
    jobs.map(async ({ region, threshold, psm }) => ({
      image: await prepare(image, toPixels(region, width, height), threshold),
      psm,
    })),
  )
}

function toPixels(region: Region, width: number, height: number): Region {
  return {
    left: Math.round(width * region.left),
    top: Math.round(height * region.top),
    width: Math.round(width * region.width),
    height: Math.round(height * region.height),
  }
}

function prepare(image: Buffer, region: Region, threshold: number): Promise<Buffer> {
  const pipeline = sharp(image)
    .extract(region)
    .resize({ width: region.width * UPSCALE, kernel: 'lanczos3' })
    .grayscale()
    .normalise()
  return (threshold > 0 ? pipeline.threshold(threshold) : pipeline).png().toBuffer()
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
