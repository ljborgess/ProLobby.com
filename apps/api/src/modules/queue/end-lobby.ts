import type { EntityManager } from '@mikro-orm/postgresql'
import type { Logger } from '@nestjs/common'
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
export async function announceEnded(
  events: EventDeliveryService,
  lobbies: Lobby[],
  logger: Pick<Logger, 'error'>,
): Promise<void> {
  for (const lobby of lobbies.filter((ended) => ended.textChannelId)) {
    try {
      await events.enqueue(
        {
          id: randomUUID(),
          occurredAt: (lobby.endedAt ?? new Date()).toISOString(),
          type: 'lobby.ended',
          payload: { lobbyId: lobby.id },
        },
        { kind: EventDeliveryTargetKind.LOBBY, id: lobby.id },
      )
    } catch (error) {
      // The lobby already ended; a lost event leaves its channels to the
      // bot's sweep, which takes them within 15 min of empty calls.
      logger.error(
        `could not announce the end of lobby ${lobby.id}`,
        error instanceof Error ? error.stack : undefined,
      )
    }
  }
}
