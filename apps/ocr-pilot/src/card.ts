import sharp from 'sharp'

import { ARCHETYPES } from './archetypes'

type Region = { left: number; top: number; width: number; height: number }

export type CardCrop = { image: Buffer; psm: string }

const UPSCALE = 6
// The archetype card's bottom text (archetype name, then gamertag) sits at the
// same screen proportions on every FC 27 print seen so far. The band holds
// both lines (PSM 6); the line crops hold only the gamertag (PSM 7), which is
// what reads underscores ("QX_MOREL_8_o"). Its exact height drifts ~0.5%.
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

// The archetype name sits right above the tag, in the same crop: a claimed
// 'Boss' must not verify against a Boss card.
const ARCHETYPE_WORDS = new Set(
  Object.keys(ARCHETYPES).flatMap((name) => name.split(' ').map(foldGamertag)),
)

/**
 * The product checks a gamertag the player already typed; it never has to
 * transcribe one. A run of consecutive words has to *equal* the claim after
 * folding what OCR confuses on this font (5/S, 0/O, 1/l/I, 8/B) and dropping
 * every symbol. No edit of slack and never a substring: measured on real
 * prints, slack gained no accepted print and let impostors through when OCR
 * dropped a letter ('Morel' must not verify against 'QX_MOREL_8_o').
 */
export function gamertagAppears(claimed: string, lines: string[]): boolean {
  const target = foldGamertag(claimed)
  if (target.length < 3) {
    return false
  }
  // Consecutive words, because a tag with spaces ('dusk wind') spans several.
  return lines.some((line) => {
    const tokens = line
      .split(/\s+/)
      .map(foldGamertag)
      .filter((token) => token !== '' && !ARCHETYPE_WORDS.has(token))
    for (let start = 0; start < tokens.length; start += 1) {
      let candidate = ''
      for (let end = start; end < tokens.length && candidate.length < target.length; end += 1) {
        candidate += tokens[end]
        if (candidate === target) {
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
    .replace(/5/g, 's')
    .replace(/0/g, 'o')
    .replace(/[1i]/g, 'l')
    .replace(/8/g, 'b')
    .replace(/[^a-z0-9]/g, '')
}

export type ImpostorVariants = {
  /** Two edits or more from the real tag. */
  far: string[]
  /** One edit away: only verifies if OCR itself misread the tag into it. */
  neighbors: string[]
}

/**
 * Claims a cheater could type against a print of the real tag. The gabarito's
 * other players are too different from each other to test near misses, so
 * these are derived from each real tag instead.
 */
export function impostorVariants(tag: string): ImpostorVariants {
  const far: string[] = []
  if (tag.length >= 5) {
    far.push(tag.slice(2))
  }
  if (tag.length >= 6) {
    far.push(tag.slice(0, Math.ceil(tag.length / 2)))
  }
  const last = tag.at(-1) ?? ''
  const swapped = last.toLowerCase() === 'q' ? 'w' : 'q'
  return { far, neighbors: [tag.slice(0, -1), tag.slice(0, -1) + swapped] }
}
