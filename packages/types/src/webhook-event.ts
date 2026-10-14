import { z } from 'zod'

const uuid = z.string().uuid()
const occurredAt = z.string().datetime()

/**
 * Discriminated union of platform → bot events (RF-058, issue #95).
 *
 * Types whose payload the dossier has not closed yet are left out on purpose:
 * an unknown `type` is refused at the edge rather than stored as `z.unknown()`.
 * Handlers for these events are not this package's job.
 */
export const lobbyClosedEventSchema = z.object({
  id: uuid,
  occurredAt,
  type: z.literal('lobby.closed'),
  // Strict, like every payload here: an unexpected field is a sender that
  // thinks it is sending something the receiver will never see. Silently
  // dropping it is how two sides drift without a single error anywhere.
  payload: z
    .object({
      lobbyId: uuid,
      sideACaptainAccountId: uuid,
      sideBCaptainAccountId: uuid,
      // Floor of 8 humans, cap of 22 — docs/produto/03-partida/02-fila.md.
      participantAccountIds: z.array(uuid).min(8).max(22),
    })
    .strict(),
})

export const accountPunishedEventSchema = z.object({
  id: uuid,
  occurredAt,
  type: z.literal('account.punished'),
  payload: z
    .object({
      accountId: uuid,
      kind: z.enum(['suspension', 'ban']),
    })
    .strict(),
})

export const quotaResourceSchema = z.enum([
  'neon_storage',
  'neon_compute',
  'neon_egress',
  'object_storage',
])

export const systemQuotaAlertEventSchema = z.object({
  id: uuid,
  occurredAt,
  type: z.literal('system.quota_alert'),
  payload: z
    .object({
      resource: quotaResourceSchema,
      percent: z.number().min(0).max(100),
      limit: z.string().min(1),
    })
    .strict(),
})

/**
 * A moderation case was opened (#226): the bot tells the private moderators'
 * channel, so the 24 h goal does not depend on someone opening the panel.
 * Only the id and the type — no gamertag, email or print ever leaves here.
 * The type stays a plain snake_case string: the list lives with the API's
 * enum, and a new kind of case must not be refused at the bot's edge.
 */
export const moderationCaseOpenedEventSchema = z.object({
  id: uuid,
  occurredAt,
  type: z.literal('moderation.case_opened'),
  payload: z
    .object({
      caseId: uuid,
      caseType: z.string().regex(/^[a-z_]{1,40}$/),
    })
    .strict(),
})

export const platformEventSchema = z.discriminatedUnion('type', [
  lobbyClosedEventSchema,
  accountPunishedEventSchema,
  systemQuotaAlertEventSchema,
  moderationCaseOpenedEventSchema,
])

export type LobbyClosedEvent = z.infer<typeof lobbyClosedEventSchema>
export type AccountPunishedEvent = z.infer<typeof accountPunishedEventSchema>
export type SystemQuotaAlertEvent = z.infer<typeof systemQuotaAlertEventSchema>
export type ModerationCaseOpenedEvent = z.infer<typeof moderationCaseOpenedEventSchema>
export type PlatformEvent = z.infer<typeof platformEventSchema>
export type QuotaResource = z.infer<typeof quotaResourceSchema>

/**
 * Derived from the union, never written by hand.
 *
 * A second, hand-kept list is a drift waiting to happen: add a schema to the
 * union, forget the list, and the edge answers `unknown_event_type` for an
 * event the contract actually accepts — a rejection with no failing test
 * anywhere to explain it.
 */
export const PLATFORM_EVENT_TYPES = platformEventSchema.options.map(
  (option) => option.shape.type.value,
)

export type PlatformEventType = PlatformEvent['type']

export function isKnownPlatformEventType(type: string): type is PlatformEventType {
  return (PLATFORM_EVENT_TYPES as string[]).includes(type)
}
