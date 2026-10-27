import type { EntityManager } from '@mikro-orm/postgresql'
import { randomUUID } from 'node:crypto'

import { EventDeliveryTargetKind } from '../bot-integration/event-delivery.enums'
import type { EventDeliveryService } from '../bot-integration/event-delivery.service'
import type { Lobby, LobbyState } from '../lobby/lobby.entity'
import { QueueEntry } from './queue-entry.entity'

/**
 * A lobby that never became a match (#247, #248): terminal state, and every
 * human back to searching at once with the time they had. No refusal and no
 * reputation event here — whatever fault there is goes to moderation.
 */
export async function endLobby(
  em: EntityManager,
  lobby: Lobby,
  state: LobbyState,
  now: Date,
): Promise<void> {
  lobby.state = state
  lobby.endedAt = now
  await em.flush()
  await em.nativeUpdate(QueueEntry, { lobby }, { lobby: null })
}

/**
 * `lobby.ended` for the bot (#251, RF-052): a cancelled or expired lobby has
 * no match left to protect, so its channels go now, not after the 15 min
 * floor. Call after the commit; lobbies the bot never made channels for
 * are skipped.
 */
export async function announceEnded(events: EventDeliveryService, lobbies: Lobby[]): Promise<void> {
  for (const lobby of lobbies.filter((ended) => ended.textChannelId)) {
    await events.enqueue(
      {
        id: randomUUID(),
        occurredAt: (lobby.endedAt ?? new Date()).toISOString(),
        type: 'lobby.ended',
        payload: { lobbyId: lobby.id },
      },
      { kind: EventDeliveryTargetKind.LOBBY, id: lobby.id },
    )
  }
}
