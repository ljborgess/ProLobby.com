import type { PlatformEvent } from '@prolobby/types'

import { announceModerationCase, type ModerationAnnounceDeps } from './moderation-case-opened'

/**
 * Routes an accepted platform event to what the bot does with it. Events
 * with no handler yet (RF-047..062) are acknowledged and dropped, as before.
 */
export async function handlePlatformEvent(
  event: PlatformEvent,
  deps: ModerationAnnounceDeps,
): Promise<void> {
  switch (event.type) {
    case 'moderation.case_opened':
      await announceModerationCase(event, deps)
      return
    default:
      return
  }
}
