import type {
  LobbyClosedEvent,
  ModerationCaseOpenedEvent,
  PlatformEvent,
  SystemQuotaAlertEvent,
} from './webhook-event'

const NIL = (n: number) => `11111111-1111-1111-1111-${n.toString().padStart(12, '0')}`

/** A Discord snowflake, fixed so tests can name who was let in. */
export const SNOWFLAKE = (n: number) => `1${n.toString().padStart(17, '0')}`

/**
 * A lobby.closed payload sized for the real case: 5 humans a side, the first
 * of each its captain. Used by webhook tests so they exercise the contract,
 * not `{}`.
 */
export function sampleLobbyClosedEvent(
  overrides: Partial<LobbyClosedEvent> = {},
): LobbyClosedEvent {
  const side = (from: number, clubName: string) => {
    const discordIds = Array.from({ length: 5 }, (_, i) => SNOWFLAKE(from + i))
    return { captainDiscordId: discordIds[0]!, clubName, discordIds }
  }

  return {
    id: NIL(100),
    occurredAt: new Date().toISOString(),
    type: 'lobby.closed',
    payload: {
      lobbyId: NIL(200),
      sideA: side(1, 'Clube Azul'),
      sideB: side(11, 'Clube Rojo'),
    },
    ...overrides,
  }
}

export function sampleQuotaAlertEvent(
  overrides: Partial<SystemQuotaAlertEvent> = {},
): SystemQuotaAlertEvent {
  return {
    id: NIL(300),
    occurredAt: new Date().toISOString(),
    type: 'system.quota_alert',
    payload: {
      resource: 'neon_storage',
      percent: 80,
      limit: '0.5GB',
    },
    ...overrides,
  }
}

export function sampleModerationCaseOpenedEvent(
  overrides: Partial<ModerationCaseOpenedEvent> = {},
): ModerationCaseOpenedEvent {
  return {
    id: NIL(400),
    occurredAt: new Date().toISOString(),
    type: 'moderation.case_opened',
    payload: { caseId: NIL(401), caseType: 'character_verification' },
    ...overrides,
  }
}

export function samplePlatformEvent(overrides?: Partial<LobbyClosedEvent>): PlatformEvent {
  return sampleLobbyClosedEvent(overrides)
}
