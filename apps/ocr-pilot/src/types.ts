export const GAME_LANGUAGES = ['pt', 'es', 'en'] as const
export type GameLanguage = (typeof GAME_LANGUAGES)[number]

export const EDITIONS = ['fc26', 'fc27'] as const
export type GameEdition = (typeof EDITIONS)[number]

export const SCREENS = ['attributes', 'archetypes'] as const
export type PilotScreen = (typeof SCREENS)[number]

export const ORIGINS = ['publico-video', 'publico-post', 'pedido', 'synthetic'] as const
export type PrintOrigin = (typeof ORIGINS)[number]

export const CAPTURES = ['screenshot', 'photo'] as const
export type CaptureKind = (typeof CAPTURES)[number]

export const REJECTION_CAUSES = [
  'low_confidence',
  'unrecognized_language',
  'gamertag_mismatch',
  'invalid_format',
  'print_already_used',
] as const
export type RejectionCause = (typeof REJECTION_CAUSES)[number]

/**
 * Individual stats on the Virtual Pro Attributes tab. Skill Moves and Weak
 * Foot are stars, not digits — out of this slice. Group headers (Ball Control /
 * Scoring on FC 27, Dribbling / Shooting on the previous layout) are not keys:
 * anchoring extraction on a header breaks when the edition changes.
 */
export const ATTRIBUTE_KEYS = [
  'acceleration',
  'sprintSpeed',
  'attPosition',
  'finishing',
  'shotPower',
  'longShots',
  'volleys',
  'penalties',
  'vision',
  'crossing',
  'fkAccuracy',
  'shortPassing',
  'longPassing',
  'curve',
  'agility',
  'balance',
  'reactions',
  'ballControl',
  'dribbling',
  'composure',
  'interceptions',
  'headingAccuracy',
  'defAwareness',
  'standingTackle',
  'slidingTackle',
  'jumping',
  'stamina',
  'strength',
  'aggression',
] as const
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number]

export type ExpectedFields = {
  overall: number | null
  gamertag: string | null
  position: string | null
  archetype: string | null
  attributes: Partial<Record<AttributeKey, number>>
}

export type ExtractedFields = ExpectedFields

export type GabaritoEntry = {
  id: string
  file: string
  edition: GameEdition
  screen: PilotScreen
  language: GameLanguage
  origin: PrintOrigin
  capture: CaptureKind
  expected: ExpectedFields
}

export type Gabarito = {
  version: 1
  entries: GabaritoEntry[]
}

export type OcrWord = {
  text: string
  confidence: number
}

export type OcrResult = {
  text: string
  confidence: number
  words: OcrWord[]
}

export type PrintMeasurement = {
  id: string
  file: string
  edition: GameEdition
  languageExpected: GameLanguage
  languageDetected: GameLanguage | null
  origin: PrintOrigin
  capture: CaptureKind
  accepted: boolean
  confidence: number | null
  causes: RejectionCause[]
  extracted: ExtractedFields | null
  mismatchedFields: string[]
  sha256: string | null
}

export type ImpostorCheck = {
  /** Other players' tags and variants of each real tag. Must stay at zero. */
  checks: number
  falseAccepts: number
}

export type PilotReport = {
  engine: string
  impostorCheck: ImpostorCheck
  firstPassAcceptRate: number
  firstPassTarget: number
  meetsTarget: boolean
  byLanguage: Record<string, number>
  byOrigin: Record<string, number>
  byCapture: Record<string, number>
  byEdition: Record<string, number>
  rejectionCauses: Record<RejectionCause, number>
  prints: PrintMeasurement[]
}
