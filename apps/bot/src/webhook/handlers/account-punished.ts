import type { AccountPunishedEvent } from '@prolobby/types'

import { BRAND, plate, type BotMessage } from '../../discord/brand'
import type { PlanRoleDeps } from './account-plan-changed'

export type PunishmentRoleDeps = Omit<PlanRoleDeps, 'roleIds'> & {
  /** `DISCORD_VERIFIED_ROLE_ID`, `DISCORD_BETA_ROLE_ID` and the plan roles of #313. */
  roleIds: { verified?: string; beta?: string; founder?: string; supporter?: string }
}

const LOG = {
  suspension: { title: 'Suspensão aplicada', color: BRAND.amber },
  suspension_ended: { title: 'Suspensão encerrada', color: BRAND.green },
  ban: { title: 'Banimento', color: BRAND.red },
} as const

export function punishmentLogMessage(event: AccountPunishedEvent, iconUrl?: string): BotMessage {
  const { title, color } = LOG[event.payload.kind]
  return {
    embeds: [
      {
        author: plate('MODERAÇÃO', iconUrl),
        color,
        title,
        description: `<@${event.payload.discordId}>`,
        timestamp: event.occurredAt,
      },
    ],
  }
}

/**
 * #324, RF-055 (docs/discord/03-bot.md): a suspension takes Verificado away
 * and its end gives it back; a ban takes Verificado, Fundador, Apoiador and
 * Beta for good. The person stays in the server either way. A role not
 * configured is skipped; without Verificado there is nothing to do. Someone
 * who left the server is warned about, not retried.
 */
export async function applyPunishmentRoles(
  event: AccountPunishedEvent,
  deps: PunishmentRoleDeps,
): Promise<void> {
  const { verified, beta, founder, supporter } = deps.roleIds
  if (!verified) {
    deps.warn('DISCORD_VERIFIED_ROLE_ID not set: punishment roles not applied')
    return
  }
  const { discordId, kind } = event.payload
  const [add, remove] =
    kind === 'suspension_ended'
      ? [[verified], []]
      : kind === 'suspension'
        ? [[], [verified]]
        : [[], [verified, beta, founder, supporter].filter((role): role is string => !!role)]
  const member = await deps.setRoles(discordId, add, remove)
  if (!member) {
    deps.warn(`${kind} for someone not in the server: roles not applied`)
    return
  }
  if (deps.logChannelId) {
    await deps.send(deps.logChannelId, punishmentLogMessage(event, deps.iconUrl?.()))
  }
}
