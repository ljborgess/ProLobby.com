import { Events, type Client, type GuildMember } from 'discord.js'

import type { Logger } from '../logger'

/**
 * What a newcomer reads — in both languages, because the channel is shared
 * and the community is not split by language (docs/discord/03-bot.md). The
 * mention is the only ping: one person, the one arriving.
 */
export function welcomeMessage(memberId: string, webUrl?: string): string {
  const link = `${(webUrl ?? 'https://prolobby.com.br').replace(/\/$/, '')}/account/discord`
  return [
    `Chegou no ProLobby, <@${memberId}>! Pra entrar na fila: crie a conta, cadastre o personagem e vincule este Discord em ${link}. As regras estão em #regras-e-onboarding.`,
    `¡Llegaste a ProLobby, <@${memberId}>! Para entrar en la fila: crea la cuenta, registra tu personaje y vincula este Discord en ${link}.`,
  ].join('\n')
}

export type WelcomeDeps = {
  /** `DISCORD_WELCOME_CHANNEL_ID`. Unset, nobody is greeted (a warning once). */
  channelId?: string
  guildId?: string
  webUrl?: string
}

/**
 * Greets every person who joins the configured server. Bots are skipped: an
 * integration being added is not someone to onboard.
 *
 * A failed greeting is logged and dropped — nothing depends on it, and
 * retrying a welcome minutes late reads worse than none.
 */
export function welcomeOn(client: Client, log: Logger, deps: WelcomeDeps): void {
  if (!deps.channelId) {
    log.warn('welcome', 'DISCORD_WELCOME_CHANNEL_ID is not set: newcomers are not greeted')
    return
  }
  const channelId = deps.channelId
  client.on(Events.GuildMemberAdd, (member: GuildMember) => {
    if (member.user.bot) return
    if (deps.guildId && member.guild.id !== deps.guildId) return
    void (async () => {
      const channel = await client.channels.fetch(channelId)
      if (!channel?.isSendable()) throw new Error('welcome channel is not one the bot can post in')
      await channel.send({
        content: welcomeMessage(member.id, deps.webUrl),
        allowedMentions: { users: [member.id] },
      })
    })().catch((error: unknown) => {
      log.warn('welcome', 'could not greet a newcomer', {
        message: error instanceof Error ? error.message : String(error),
      })
    })
  })
}
