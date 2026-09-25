import sharp from 'sharp'

import { matchArchetype } from './archetypes'

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

/**
 * The product checks a gamertag the player already typed; it never has to
 * transcribe one. A whole card line has to *equal* the claim after folding
 * what OCR confuses on this font (5/S, 0/O, 1/l/I, 8/B) and dropping every
 * symbol. No edit of slack and never a piece of the line: measured on real
 * prints, slack gained no accepted print and let impostors through when OCR
 * dropped a letter ('Morel' must not verify against 'QX_MOREL_8_o').
 */
export function gamertagAppears(claimed: string, lines: string[]): boolean {
  const target = foldGamertag(claimed)
  const readings = new Set(lines.map(lineReading))
  // The icon glued to the tag ('OTag') reads as one character more; when
  // another line has it split off ('O Tag'), the shorter reading is the tag.
  return target.length >= 3 && readings.has(target) && !readings.has(target.slice(1))
}

/**
 * Each line gives at most one reading, so it verifies at most one claim.
 * The platform icon comes first and OCR reads it as one character ('O', 'd',
 * '(2)'), so a one-character first word is always dropped: a real tag that
 * starts with a one-letter word can't verify from that line. The end of the
 * line is where OCR leaves junk ('|', '2') and where it misreads the tag's
 * last character as a symbol ('4B9?'). Junk there and the tag's own tail
 * ('_8_o' read as '8 o') look the same, so a line that doesn't end in a word
 * of two characters or more, alphanumeric at the end, gives no reading.
 */
function lineReading(line: string): string | null {
  const raw = line.trim().split(/\s+/)
  const last = raw.at(-1) ?? ''
  if (!/[a-z0-9]$/i.test(last) || foldGamertag(last).length < 2) {
    return null
  }
  const words = raw.filter((word) => foldGamertag(word) !== '')
  if (words.length > 1 && foldGamertag(words[0] ?? '').length === 1) {
    words.shift()
  }
  // The archetype name sits on its own line right above the tag: a claimed
  // 'Boss' must not verify against a Boss card. Fuzzy like the title read
  // ('ARGET'), so a tag one letter from an archetype name ('Sparky') fails.
  if (words.length === 0 || matchArchetype(words.join(' ')) !== null) {
    return null
  }
  return words.map(foldGamertag).join('')
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

/**
 * Claims a cheater could type against a print of the real tag. The gabarito's
 * other players are too different from each other to test near misses, so
 * these are derived from each real tag instead: one edit off, one character
 * more (what junk or the icon next to the tag reads as), and pieces of it.
 */
export function impostorVariants(tag: string): string[] {
  const variants = [
    tag.slice(0, -1),
    tag.slice(0, -1) + (/q$/i.test(tag) ? 'w' : 'q'),
    `${tag}x`,
    `${tag}2`,
    `O${tag}`,
  ]
  if (tag.length >= 5) {
    variants.push(tag.slice(2))
  }
  if (tag.length >= 6) {
    variants.push(tag.slice(0, Math.ceil(tag.length / 2)))
  }
  const pieces = tag.split(/[\s_]+/).filter((piece) => piece !== '')
  if (pieces.length > 1) {
    variants.push(pieces[0] ?? '', pieces.at(-1) ?? '')
  }
  return [...new Set(variants)].filter((variant) => foldGamertag(variant) !== foldGamertag(tag))
}
