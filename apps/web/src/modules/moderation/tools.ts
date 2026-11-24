/**
 * The panel's management sections (#310, #314): players, audit, beta metrics
 * and plans. These types are the API's contract (#312, #313, on `dev`),
 * copied by hand: the API sends no e-mail and no birth date, and nothing here
 * asks for them.
 */
export type Plan = 'founder' | 'supporter' | 'none'

export interface PlayerSummary {
  accountId: string
  characters: { name: string | null; category: string }[]
  reputation: number
  plan: Plan
  discordMention: string | null
}

export interface PlayerSheet extends PlayerSummary {
  /** The account's state: active, suspended, banned... */
  state: string
  /** When a Supporter plan lapses; null for no plan or a Founder. */
  planExpiresAt: string | null
  cases: { id: string; type: string; state: 'open' | 'resolved' | 'dismissed'; openedAt: string }[]
  punishments: { kind: string; openedAt: string; decision: string | null }[]
}

export interface AuditEntry {
  id: string
  action: string
  /** Who acted, when it was an account; the filter below takes this id. */
  actorId: string | null
  actorLabel: string
  targetAccountId: string | null
  caseId: string | null
  before: string | null
  after: string | null
  createdAt: string
}

/** `actor` and `account` are account ids (UUID): the API answers 400 to anything else. */
export interface AuditFilters {
  actor: string
  action: string
  account: string
}

export interface AuditPage {
  entries: AuditEntry[]
  /** The cursor for the next, older page; null when this was the last. */
  next: string | null
}

export type SuccessBand = 'worked' | 'ambiguous' | 'failed'

/** The API sends the key, never a label: the words are the web's (content/moderation-tools.ts). */
export interface BetaMetric {
  key: string
  value: number | null
  target: number
  met: boolean
}

export interface SuccessMetric {
  key: string
  value: number | null
  band: SuccessBand | null
}

export interface Metrics {
  beta: BetaMetric[]
  success: SuccessMetric[]
}

/**
 * What a plan change answered: `ok`, `forbidden` (not an admin: 403
 * `admin_only`), `account_closed` (banned or deleted: 409), `already_founder`
 * (a Founder does not become a Supporter: 409) or anything else that failed.
 */
export type PlanResult = 'ok' | 'forbidden' | 'account_closed' | 'already_founder' | 'failed'

/**
 * Where the management sections read and write. Today only the sample one
 * (sample-tools.ts) exists, in the shapes of the contract, so the screens can
 * be tried before the web is wired to the API (#312, #313).
 */
export interface ToolsSource {
  searchPlayers(query: string): Promise<PlayerSummary[]>
  player(accountId: string): Promise<PlayerSheet | null>
  audit(filters: AuditFilters, before: string | null): Promise<AuditPage>
  metrics(): Promise<Metrics>
  setPlan(accountId: string, plan: Plan, pixReference: string): Promise<PlanResult>
}

export const AUDIT_PAGE_SIZE = 10
/** The API's PIX end-to-end id: 8 to 64 letters, digits or hyphens. Revoking needs none. */
export const PIX_REFERENCE = /^[A-Za-z0-9-]{8,64}$/
export const MAX_PIX_REFERENCE = 64
/** A search shorter than this answers nothing. */
export const MIN_SEARCH_LENGTH = 2
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (value: string): boolean => UUID.test(value)
