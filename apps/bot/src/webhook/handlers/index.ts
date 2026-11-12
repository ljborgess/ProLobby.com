import type { PlatformEvent } from '@prolobby/types'

import { applyPlanRole } from './account-plan-changed'
import { applyPunishmentRoles, type PunishmentRoleDeps } from './account-punished'
import { openLobbyChannels, type LobbyChannelsDeps } from './lobby-closed'
import { dropLobbyChannels, type LobbyEndedDeps } from './lobby-ended'
import { notifyCaseClosed, type CaseClosedDeps } from './moderation-case-closed'
import { announceModerationCase, type ModerationAnnounceDeps } from './moderation-case-opened'
import { announceLobbyClosed, showQueueBoard, type QueueStatusDeps } from './queue-status'

export type PlatformEventDeps = ModerationAnnounceDeps & {
  lobby: LobbyChannelsDeps & LobbyEndedDeps
  queueStatus: QueueStatusDeps
  dm: CaseClosedDeps['dm']
  roles: Pick<PunishmentRoleDeps, 'roleIds' | 'setRoles' | 'logChannelId'>
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
      // Not awaited: the public card must not hold the channels' acknowledgement.
      void announceLobbyClosed(event, deps.queueStatus, deps.warn)
      return
    case 'lobby.ended':
      await dropLobbyChannels(event, deps.lobby)
      return
    case 'moderation.case_opened':
      await announceModerationCase(event, deps)
      return
    case 'moderation.case_closed':
      await notifyCaseClosed(event, deps)
      return
    case 'account.punished':
      await applyPunishmentRoles(event, {
        ...deps.roles,
        send: deps.send,
        iconUrl: deps.iconUrl,
        warn: deps.warn,
      })
      return
    case 'account.plan_changed':
      await applyPlanRole(event, {
        ...deps.roles,
        send: deps.send,
        iconUrl: deps.iconUrl,
        warn: deps.warn,
      })
      return
    case 'queue.board':
      await showQueueBoard(event, deps.queueStatus)
      return
    default:
      return
  }
}
