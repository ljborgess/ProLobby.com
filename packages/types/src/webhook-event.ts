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
  payload: z.object({
    lobbyId: uuid,
    sideACaptainAccountId: uuid,
    sideBCaptainAccountId: uuid,
    // Floor of 8 humans, cap of 22 — docs/produto/03-partida/02-fila.md.
    participantAccountIds: z.array(uuid).min(8).max(22),
  }),
})

export const accountPunishedEventSchema = z.object({
  id: uuid,
  occurredAt,
  type: z.literal('account.punished'),
  payload: z.object({
    accountId: uuid,
    kind: z.enum(['suspension', 'ban']),
  }),
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

export const platformEventSchema = z.discriminatedUnion('type', [
  lobbyClosedEventSchema,
  accountPunishedEventSchema,
  systemQuotaAlertEventSchema,
])

export type LobbyClosedEvent = z.infer<typeof lobbyClosedEventSchema>
export type AccountPunishedEvent = z.infer<typeof accountPunishedEventSchema>
export type SystemQuotaAlertEvent = z.infer<typeof systemQuotaAlertEventSchema>
export type PlatformEvent = z.infer<typeof platformEventSchema>
export type QuotaResource = z.infer<typeof quotaResourceSchema>

export const PLATFORM_EVENT_TYPES = ['lobby.closed', 'account.punished', 'system.quota_alert'] as const

export type PlatformEventType = (typeof PLATFORM_EVENT_TYPES)[number]

export function isKnownPlatformEventType(type: string): type is PlatformEventType {
  return (PLATFORM_EVENT_TYPES as readonly string[]).includes(type)
}
