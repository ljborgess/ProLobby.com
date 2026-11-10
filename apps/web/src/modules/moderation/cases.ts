/**
 * The moderation panel's case queue, by section (#306, #309). These types are
 * the API's contract (`GET /api/moderation/cases`, #307), copied by hand: the
 * API sends no e-mail and no birth date, and nothing here asks for them.
 */
export const SECTION_KEYS = [
  'verifications',
  'reports',
  'matches',
  'appeals',
  'support',
  'system',
] as const
export type SectionKey = (typeof SECTION_KEYS)[number]

export const CASE_TYPES = [
  'character_verification',
  'ocr_exception',
  'gamertag_change',
  'linked_identity_change',
  'user_report',
  'captain_abuse',
  'negative_rating_threshold',
  'baseless_reports',
  'score_dispute',
  'possible_game_bug',
  'punishment_appeal',
  'support_request',
  'account_recovery',
  'bot_delivery_failure',
] as const
export type CaseType = (typeof CASE_TYPES)[number]

export interface SectionSummary {
  key: SectionKey
  open: number
  types: { type: CaseType; open: number }[]
}

export interface CaseListItem {
  id: string
  type: CaseType
  section: SectionKey
  openedAt: string
  overdue: boolean
  preview: string | null
}

export type ReportReason = 'fraud' | 'disconnect' | 'behavior'

export interface CasePerson {
  role: 'opened_by' | 'target'
  characters: { name: string | null; category: string }[]
  reputation: number | null
  history: { open: number; resolved: number; dismissed: number }
  discordMention: string | null
}

export interface CaseDetail extends Omit<CaseListItem, 'preview'> {
  origin: string
  lobbyId: string | null
  text: string | null
  reportReason: ReportReason | null
  people: CasePerson[]
}

export type Outcome = 'resolved' | 'dismissed'

export const RESOLVED_REASONS = ['confirmed', 'handled_elsewhere', 'settled_with_person'] as const
export const DISMISSED_REASONS = [
  'no_evidence',
  'duplicate',
  'within_rules',
  'already_resolved',
] as const
export type ClosureReason = (typeof RESOLVED_REASONS)[number] | (typeof DISMISSED_REASONS)[number]

export const REASONS_OF: Record<Outcome, readonly ClosureReason[]> = {
  resolved: RESOLVED_REASONS,
  dismissed: DISMISSED_REASONS,
}

export const MAX_NOTE = 500

export interface Closure {
  outcome: Outcome
  reason: ClosureReason
  note?: string
}

/** Why a closure did not go through: the case was closed meanwhile, or anything else. */
export type CloseResult = 'closed' | 'already_closed' | 'failed'

/**
 * Where the panel reads and writes. The real one talks to `/bff`; the sample
 * one (sample-cases.ts) keeps everything in memory, in the same shapes, so the
 * screens can be built and tried before the API is on `dev`.
 */
export interface CasesSource {
  summary(): Promise<SectionSummary[]>
  list(section: SectionKey | null, type: CaseType | null): Promise<CaseListItem[]>
  detail(id: string): Promise<CaseDetail | null>
  close(id: string, closure: Closure): Promise<CloseResult>
}

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return (await response.json()) as T
}

/** The real source: the same-origin proxy of the API (#307), never the API itself. */
export const bffSource: CasesSource = {
  async summary() {
    const body = await json<{ sections: SectionSummary[] }>(
      await fetch('/bff/moderation/cases/summary'),
    )
    return body.sections
  },
  async list(section, type) {
    const query = new URLSearchParams()
    if (section) query.set('section', section)
    if (type) query.set('type', type)
    const suffix = query.size > 0 ? `?${query}` : ''
    return json<CaseListItem[]>(await fetch(`/bff/moderation/cases${suffix}`))
  },
  async detail(id) {
    const response = await fetch(`/bff/moderation/cases/${id}`)
    if (response.status === 404) return null
    return json<CaseDetail>(response)
  },
  async close(id, closure) {
    const response = await fetch(`/bff/moderation/cases/${id}/closures`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(closure),
    })
    if (response.status === 204) return 'closed'
    if (response.status === 409) return 'already_closed'
    return 'failed'
  },
}

/** Oldest first: the order a moderator works the queue in. */
export const oldestFirst = (items: CaseListItem[]): CaseListItem[] =>
  [...items].sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime())
