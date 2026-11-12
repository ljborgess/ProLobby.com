import type { AccountPlanChangedEvent } from '@prolobby/types'

import { BRAND, plate, type BotMessage } from '../../discord/brand'

const PLAN_LABEL = { founder: 'Fundador', supporter: 'Apoiador' } as const

export type PlanRoleDeps = {
  /** `DISCORD_FOUNDER_ROLE_ID` / `DISCORD_SUPPORTER_ROLE_ID`. */
  roleIds: { founder?: string; supporter?: string }
  /** Adds and removes roles; resolves `false` when the person is not in the server. */
  setRoles: (userId: string, add: string[], remove: string[]) => Promise<boolean>
  /** `DISCORD_MODERATION_LOG_CHANNEL_ID`: #log-moderacao. */
  logChannelId?: string
  send: (channelId: string, message: BotMessage) => Promise<void>
  iconUrl?: () => string | undefined
  warn: (message: string) => void
}

/** The #log-moderacao line: who and which plan, nothing about the payment. */
export function planLogMessage(event: AccountPlanChangedEvent, iconUrl?: string): BotMessage {
  const { discordId, plan } = event.payload
  return {
    embeds: [
      {
        author: plate('PLANO', iconUrl),
        color: plan === 'none' ? BRAND.amber : BRAND.green,
        title: plan === 'none' ? 'Plano revogado' : `Plano ativado: ${PLAN_LABEL[plan]}`,
        description: `<@${discordId}>`,
        timestamp: event.occurredAt,
      },
    ],
  }
}

/**
 * #313: the plan's role, recognition only (docs/discord/03-bot.md). The other
 * plan's role goes away, so a Supporter who becomes Founder holds one. A
 * missing role id or a person who left the server is not something a retry
 * fixes: warn and accept, so no delivery-failure case opens.
 */
export async function applyPlanRole(
  event: AccountPlanChangedEvent,
  deps: PlanRoleDeps,
): Promise<void> {
  const { founder, supporter } = deps.roleIds
  if (!founder || !supporter) {
    deps.warn('DISCORD_FOUNDER_ROLE_ID / DISCORD_SUPPORTER_ROLE_ID not set: plan role not applied')
    return
  }
  const { discordId, plan } = event.payload
  const add = plan === 'founder' ? [founder] : plan === 'supporter' ? [supporter] : []
  const remove = [founder, supporter].filter((role) => !add.includes(role))
  const member = await deps.setRoles(discordId, add, remove)
  if (!member) {
    deps.warn('plan changed for someone not in the server: role not applied')
    return
  }
  if (deps.logChannelId) {
    await deps.send(deps.logChannelId, planLogMessage(event, deps.iconUrl?.()))
  }
}
