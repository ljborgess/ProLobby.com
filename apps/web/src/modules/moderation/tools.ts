/**
 * The panel's management sections (#310, #314): players, audit, beta metrics
 * and plans. These types are the API's contract (#312, #313), copied by hand:
 * the API sends no e-mail and no birth date, and nothing here asks for them.
 */
export type Plan = 'founder' | 'supporter' | 'none'

export interface PlayerSummary {
  accountId: string
  characters: { name: string | null; category: string }[]
  reputation: number | null
  plan: Plan
  discordMention: string | null
}

export interface PlayerSheet extends PlayerSummary {
  cases: { id: string; type: string; state: 'open' | 'resolved' | 'dismissed'; openedAt: string }[]
  punishments: { kind: string; from: string; until: string | null }[]
}

export interface AuditEntry {
  id: string
  action: string
  actorLabel: string
  targetAccountId: string | null
  caseId: string | null
  before: string | null
  after: string | null
  createdAt: string
}

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

export interface BetaMetric {
  key: string
  label: string
  value: number | null
  target: number
  met: boolean
}

export interface SuccessMetric {
  key: string
  label: string
  value: number | null
  band: SuccessBand | null
}

export interface Metrics {
  beta: BetaMetric[]
  success: SuccessMetric[]
}

/** `ok`, `forbidden` (not an admin: 403) or anything else that failed. */
export type PlanResult = 'ok' | 'forbidden' | 'failed'

/**
 * Where the management sections read and write. Today only the sample one
 * (sample-tools.ts) exists, in the shapes of the contract, so the screens can
 * be built before the API of #312 and #313 is on `dev`.
 */
export interface ToolsSource {
  searchPlayers(query: string): Promise<PlayerSummary[]>
  player(accountId: string): Promise<PlayerSheet | null>
  audit(filters: AuditFilters, before: string | null): Promise<AuditPage>
  metrics(): Promise<Metrics>
  setPlan(accountId: string, plan: Plan, pixReference: string): Promise<PlanResult>
}

export const AUDIT_PAGE_SIZE = 10
export const MAX_PIX_REFERENCE = 60
