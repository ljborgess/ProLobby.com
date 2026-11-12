import { z } from 'zod'

import { snowflake } from './bot-event'

const uuid = z.guid()
const occurredAt = z.string().datetime()

/**
 * One side of a closed lobby, as the bot needs it to open the channels
 * (#250): who may see this side's voice channel, who to name as captain, and
 * the club the captain declared. Discord ids, not account ids: the bot has no
 * database to turn one into the other. They are personal data (RNF-009), which
 * is why `EventDelivery` keeps the payload encrypted.
 */
const lobbySideSchema = z
  .object({
    captainDiscordId: snowflake,
    clubName: z.string().min(1).max(20),
    // Every human of the side, the captain included; 11 a side at most.
    discordIds: z.array(snowflake).min(1).max(11),
  })
  .strict()

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
      sideA: lobbySideSchema,
      sideB: lobbySideSchema,
    })
    .strict(),
})

/**
 * A lobby with channels ended without a match to protect — cancelled in the
 * invite window or expired with no print (#251, RF-052). The bot deletes its
 * three channels at once instead of waiting for the 15 min floor.
 */
export const lobbyEndedEventSchema = z.object({
  id: uuid,
  occurredAt,
  type: z.literal('lobby.ended'),
  payload: z.object({ lobbyId: uuid }).strict(),
})

/**
 * A punishment applied or served (RF-055, #324): suspension takes Verificado
 * away, its end gives it back, a ban takes every role away for good
 * (docs/discord/03-bot.md). The Discord id, not the account id: the bot has
 * no database to turn one into the other.
 */
export const accountPunishedEventSchema = z.object({
  id: uuid,
  occurredAt,
  type: z.literal('account.punished'),
  payload: z
    .object({
      discordId: snowflake,
      kind: z.enum(['suspension', 'suspension_ended', 'ban']),
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

/**
 * A case closed from the moderation panel (#306, #308): the bot sends the
 * outcome by DM to whoever opened it — never to the person reported (RF-036).
 * The Discord id is personal data; `EventDelivery` keeps the payload encrypted.
 */
export const moderationCaseClosedEventSchema = z.object({
  id: uuid,
  occurredAt,
  type: z.literal('moderation.case_closed'),
  payload: z
    .object({
      discordId: snowflake,
      caseType: z.string().regex(/^[a-z_]{1,40}$/),
      outcome: z.enum(['resolved', 'dismissed']),
      reason: z.string().regex(/^[a-z_]{1,40}$/),
      note: z.string().max(500).nullable(),
    })
    .strict(),
})

/**
 * A plan activated or revoked in the panel (#313): the bot gives the Founder or
 * Supporter role — recognition only, no channel or permission — takes the
 * other one away, and logs it in #log-moderacao. `none` takes both away.
 */
export const accountPlanChangedEventSchema = z.object({
  id: uuid,
  occurredAt,
  type: z.literal('account.plan_changed'),
  payload: z
    .object({
      discordId: snowflake,
      plan: z.enum(['founder', 'supporter', 'none']),
    })
    .strict(),
})

const movementBandSchema = z.enum(['low', 'busy', 'full'])

/**
 * The public board of the queue for #fila-status: the band of each category
 * (RF-008 — never the count) and why no lobby closes, if it is paused (#271).
 * Sent only when it changes, best effort: a lost one is replaced by the next.
 */
export const queueBoardEventSchema = z.object({
  id: uuid,
  occurredAt,
  type: z.literal('queue.board'),
  payload: z
    .object({
      bands: z
        .object({
          goalkeeper: movementBandSchema,
          defender: movementBandSchema,
          midfielder: movementBandSchema,
          winger: movementBandSchema,
          striker: movementBandSchema,
        })
        .strict(),
      paused: z.enum(['discord_unavailable', 'channels_full', 'lobbies_full']).nullable(),
    })
    .strict(),
})

export const platformEventSchema = z.discriminatedUnion('type', [
  lobbyClosedEventSchema,
  lobbyEndedEventSchema,
  accountPunishedEventSchema,
  systemQuotaAlertEventSchema,
  moderationCaseOpenedEventSchema,
  moderationCaseClosedEventSchema,
  queueBoardEventSchema,
  accountPlanChangedEventSchema,
])

export type LobbyClosedEvent = z.infer<typeof lobbyClosedEventSchema>
export type LobbyEndedEvent = z.infer<typeof lobbyEndedEventSchema>
export type AccountPunishedEvent = z.infer<typeof accountPunishedEventSchema>
export type SystemQuotaAlertEvent = z.infer<typeof systemQuotaAlertEventSchema>
export type ModerationCaseOpenedEvent = z.infer<typeof moderationCaseOpenedEventSchema>
export type ModerationCaseClosedEvent = z.infer<typeof moderationCaseClosedEventSchema>
export type QueueBoardEvent = z.infer<typeof queueBoardEventSchema>
export type AccountPlanChangedEvent = z.infer<typeof accountPlanChangedEventSchema>
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
