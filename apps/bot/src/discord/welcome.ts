import { Events, type Client, type GuildMember } from 'discord.js'

import type { Logger } from '../logger'
import { BRAND, linkRow, picture, plate, webLink, type BotMessage } from './brand'
import { render, welcomeSvg } from './cards'

/**
 * What a newcomer sees: a pre-match card with the three steps to the queue
 * and the two buttons that take them there. The mention sits outside the
 * embed — only text outside it pings — and it is the only ping, one person.
 */
export function welcomeMessage(
  memberId: string,
  opts: { webUrl?: string; iconUrl?: string; name?: string } = {},
): BotMessage {
  const art = picture(
    'boas-vindas.png',
    render(welcomeSvg(opts.name ?? 'jogador')),
    'Chegou no ProLobby. 1: crie a conta. 2: cadastre o personagem com o print do jogo. 3: vincule este Discord e entre na fila.',
  )
  return {
    content: `<@${memberId}>`,
    embeds: [
      {
        author: plate('ENTRADA EM CAMPO', opts.iconUrl),
        color: BRAND.green,
        description: [
          'Matchmaking de verdade pro seu Pro Clubs: você entra sozinho, pela posição que joga, e a gente monta o jogo.',
          '*¡Llegaste! Crea la cuenta, registra tu personaje y vincula este Discord.*',
        ].join('\n'),
        image: art.image,
        footer: { text: 'Regras em #regras-e-onboarding · Ajuda em #suporte-e-denuncia' },
      },
    ],
    files: [art.file],
    components: [
      linkRow([
        { label: 'Criar conta', url: webLink(opts.webUrl, '/sign-up'), emoji: '📝' },
        { label: 'Vincular Discord', url: webLink(opts.webUrl, '/account/discord'), emoji: '🔗' },
      ]),
    ],
  }
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
        ...welcomeMessage(member.id, {
          webUrl: deps.webUrl,
          iconUrl: client.user?.displayAvatarURL(),
          name: member.displayName,
        }),
        allowedMentions: { users: [member.id] },
      })
    })().catch((error: unknown) => {
      log.warn('welcome', 'could not greet a newcomer', {
        message: error instanceof Error ? error.message : String(error),
      })
    })
  })
}
