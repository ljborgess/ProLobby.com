import { ModerationCaseType } from './moderation-case.enums'

/**
 * The panel's sidebar (#306): each case type lives in one section, grouped by
 * how a moderator resolves it. `null` keeps a type out of the queue —
 * suspensions and bans are born resolved and are only history.
 */
export enum ModerationSection {
  VERIFICATIONS = 'verifications',
  REPORTS = 'reports',
  MATCHES = 'matches',
  APPEALS = 'appeals',
  SUPPORT = 'support',
  SYSTEM = 'system',
}

export const SECTION_OF: Record<ModerationCaseType, ModerationSection | null> = {
  [ModerationCaseType.CHARACTER_VERIFICATION]: ModerationSection.VERIFICATIONS,
  [ModerationCaseType.OCR_EXCEPTION]: ModerationSection.VERIFICATIONS,
  [ModerationCaseType.GAMERTAG_CHANGE]: ModerationSection.VERIFICATIONS,
  [ModerationCaseType.LINKED_IDENTITY_CHANGE]: ModerationSection.VERIFICATIONS,
  [ModerationCaseType.USER_REPORT]: ModerationSection.REPORTS,
  [ModerationCaseType.CAPTAIN_ABUSE]: ModerationSection.REPORTS,
  [ModerationCaseType.NEGATIVE_RATING_THRESHOLD]: ModerationSection.REPORTS,
  [ModerationCaseType.BASELESS_REPORTS]: ModerationSection.REPORTS,
  [ModerationCaseType.SCORE_DISPUTE]: ModerationSection.MATCHES,
  [ModerationCaseType.POSSIBLE_GAME_BUG]: ModerationSection.MATCHES,
  [ModerationCaseType.PUNISHMENT_APPEAL]: ModerationSection.APPEALS,
  [ModerationCaseType.SUPPORT_REQUEST]: ModerationSection.SUPPORT,
  [ModerationCaseType.ACCOUNT_RECOVERY]: ModerationSection.SUPPORT,
  [ModerationCaseType.BOT_DELIVERY_FAILURE]: ModerationSection.SYSTEM,
  [ModerationCaseType.SUSPENSION]: null,
  [ModerationCaseType.BAN]: null,
}

export const typesOf = (section: ModerationSection): ModerationCaseType[] =>
  (Object.keys(SECTION_OF) as ModerationCaseType[]).filter((type) => SECTION_OF[type] === section)

export const QUEUED_TYPES = (Object.keys(SECTION_OF) as ModerationCaseType[]).filter(
  (type) => SECTION_OF[type] !== null,
)

/**
 * The response goals of docs/produto/04-governanca/01-moderacao.md: 24 h for
 * verification and match disputes, 48 h for reports and appeals. Support and
 * system have no written goal; they follow the stricter of the two.
 */
export const GOAL_HOURS: Record<ModerationSection, number> = {
  [ModerationSection.VERIFICATIONS]: 24,
  [ModerationSection.MATCHES]: 24,
  [ModerationSection.REPORTS]: 48,
  [ModerationSection.APPEALS]: 48,
  [ModerationSection.SUPPORT]: 24,
  [ModerationSection.SYSTEM]: 24,
}

/** How a moderator closes a case (#306): one click each, read by the person involved. */
export enum ClosureReason {
  CONFIRMED = 'confirmed',
  HANDLED_ELSEWHERE = 'handled_elsewhere',
  SETTLED_WITH_PERSON = 'settled_with_person',
  NO_EVIDENCE = 'no_evidence',
  DUPLICATE = 'duplicate',
  WITHIN_RULES = 'within_rules',
  ALREADY_RESOLVED = 'already_resolved',
}

export const RESOLVED_REASONS: readonly ClosureReason[] = [
  ClosureReason.CONFIRMED,
  ClosureReason.HANDLED_ELSEWHERE,
  ClosureReason.SETTLED_WITH_PERSON,
]

export const DISMISSED_REASONS: readonly ClosureReason[] = [
  ClosureReason.NO_EVIDENCE,
  ClosureReason.DUPLICATE,
  ClosureReason.WITHIN_RULES,
  ClosureReason.ALREADY_RESOLVED,
]

/** The words the person reads in `decision` (Portuguese, like every other decision today). */
export const REASON_LABEL: Record<ClosureReason, string> = {
  [ClosureReason.CONFIRMED]: 'Procedente: confirmado',
  [ClosureReason.HANDLED_ELSEWHERE]: 'Procedente: ação tomada fora do painel',
  [ClosureReason.SETTLED_WITH_PERSON]: 'Procedente: resolvido com a pessoa',
  [ClosureReason.NO_EVIDENCE]: 'Improcedente: sem prova',
  [ClosureReason.DUPLICATE]: 'Improcedente: duplicado',
  [ClosureReason.WITHIN_RULES]: 'Improcedente: não fere as regras',
  [ClosureReason.ALREADY_RESOLVED]: 'Improcedente: já resolvido',
}
