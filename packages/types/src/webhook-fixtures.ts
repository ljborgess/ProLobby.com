import type { LobbyClosedEvent, PlatformEvent, SystemQuotaAlertEvent } from './webhook-event'

const NIL = (n: number) => `11111111-1111-1111-1111-${n.toString().padStart(12, '0')}`

/**
 * A lobby.closed payload sized for the real case: 10 humans, two captains.
 * Used by webhook tests so they exercise the contract, not `{}`.
 */
export function sampleLobbyClosedEvent(
  overrides: Partial<LobbyClosedEvent> = {},
): LobbyClosedEvent {
  const participantAccountIds = Array.from({ length: 10 }, (_, i) => NIL(i + 1))

  return {
    id: NIL(100),
    occurredAt: new Date().toISOString(),
    type: 'lobby.closed',
    payload: {
      lobbyId: NIL(200),
      sideACaptainAccountId: NIL(1),
      sideBCaptainAccountId: NIL(2),
      participantAccountIds,
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

export function samplePlatformEvent(overrides?: Partial<LobbyClosedEvent>): PlatformEvent {
  return sampleLobbyClosedEvent(overrides)
}
