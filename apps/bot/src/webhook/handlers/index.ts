import type { PlatformEvent } from '@prolobby/types'

import { openLobbyChannels, type LobbyChannelsDeps } from './lobby-closed'
import { dropLobbyChannels, type LobbyEndedDeps } from './lobby-ended'
import { announceModerationCase, type ModerationAnnounceDeps } from './moderation-case-opened'

export type PlatformEventDeps = ModerationAnnounceDeps & {
  lobby: LobbyChannelsDeps & LobbyEndedDeps
}

/**
 * Routes an accepted platform event to what the bot does with it. Events
 * with no handler yet (RF-047..062) are acknowledged and dropped, as before.
 */
export async function handlePlatformEvent(
  event: PlatformEvent,
  deps: PlatformEventDeps,
): Promise<void> {
  switch (event.type) {
    case 'lobby.closed':
      await openLobbyChannels(event, deps.lobby)
      return
    case 'lobby.ended':
      await dropLobbyChannels(event, deps.lobby)
      return
    case 'moderation.case_opened':
      await announceModerationCase(event, deps)
      return
    default:
      return
  }
}
