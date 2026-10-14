import type { EntityManager } from '@mikro-orm/postgresql'

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
