import type { ExpectedFields, ExtractedFields, RejectionCause } from './types'

export type FieldMatch = {
  mismatchedFields: string[]
  gamertagMismatch: boolean
}

/**
 * Only fields the gabarito actually asserts are scored. FC 27 Attributes
 * leaves overall and gamertag null — missing them is not a miss. A gamertag
 * that the gabarito *did* assert (a future Home-screen entry, or FC 26) is
 * the product rejection cause "gamertag divergente".
 */
export function matchFields(expected: ExpectedFields, extracted: ExtractedFields): FieldMatch {
  const mismatchedFields: string[] = []

  if (expected.overall !== null && expected.overall !== extracted.overall) {
    mismatchedFields.push('overall')
  }
  if (
    expected.position !== null &&
    normalizeToken(expected.position) !== normalizeToken(extracted.position)
  ) {
    mismatchedFields.push('position')
  }

  const gamertagMismatch =
    expected.gamertag !== null &&
    normalizeToken(expected.gamertag) !== normalizeToken(extracted.gamertag)
  if (gamertagMismatch) {
    mismatchedFields.push('gamertag')
  }

  for (const [key, value] of Object.entries(expected.attributes)) {
    if (extracted.attributes[key as keyof typeof extracted.attributes] !== value) {
      mismatchedFields.push(`attributes.${key}`)
    }
  }

  return { mismatchedFields, gamertagMismatch }
}

export function firstPassAccepted(input: {
  causes: RejectionCause[]
  mismatchedFields: string[]
  confidence: number | null
  minConfidence: number
}): boolean {
  return (
    input.causes.length === 0 &&
    input.mismatchedFields.length === 0 &&
    input.confidence !== null &&
    input.confidence >= input.minConfidence
  )
}

function normalizeToken(value: string | null): string {
  return (value ?? '').trim().toLowerCase()
}
