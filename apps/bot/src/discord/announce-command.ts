import {
  Events,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
} from 'discord.js'

import type { Logger } from '../logger'
import { BRAND, plate, type BotMessage } from './brand'

/** Room for the text plus the two-line header, under Discord's 2000. */
export const ANNOUNCEMENT_MAX = 1800

/**
 * `/anunciar` — a moderator command, the only kind the bot takes
 * (docs/discord/03-bot.md: no player commands). Hidden from everyone without
 * Manage Server by default; the handler checks again, because a server admin
 * can widen who sees a command in the server settings.
 */
export const announceCommand = new SlashCommandBuilder()
  .setName('anunciar')
  .setDescription('Posta um anúncio em #anuncios')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setContexts(0) // InteractionContextType.Guild: never in a DM
  .addStringOption((option) =>
    option
      .setName('texto')
      .setDescription('O que vai no anúncio')
      .setRequired(true)
      .setMaxLength(ANNOUNCEMENT_MAX),
  )
  .addStringOption((option) =>
    option.setName('titulo').setDescription('Título em destaque (opcional)').setMaxLength(120),
  )
  .addBooleanOption((option) =>
    option.setName('marcar_todos').setDescription('Marca @everyone (padrão: não)'),
  )

export type AnnounceInput = {
  allowed: boolean
  text: string
  title?: string | null
  pingEveryone: boolean
}

/** The announcement as a broadcast card; @everyone rides outside it, where it pings. */
export function announcementMessage(
  input: { text: string; title?: string | null; pingEveryone: boolean },
  iconUrl?: string,
): BotMessage {
  return {
    ...(input.pingEveryone ? { content: '@everyone' } : {}),
    embeds: [
      {
        author: plate('ANÚNCIO', iconUrl),
        color: BRAND.green,
        ...(input.title?.trim() ? { title: input.title.trim() } : {}),
        description: input.text,
        footer: { text: 'Equipe ProLobby' },
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

export type AnnounceDeps = {
  /** `DISCORD_ANNOUNCEMENTS_CHANNEL_ID`. */
  channelId?: string
  post: (channelId: string, message: BotMessage, pingEveryone: boolean) => Promise<void>
  iconUrl?: string
}

/** What the moderator reads back, privately. The decision lives here, not in the wiring. */
export async function announce(input: AnnounceInput, deps: AnnounceDeps): Promise<string> {
  if (!input.allowed) return 'Só Admin e Moderador podem anunciar.'
  if (!deps.channelId)
    return 'Canal de anúncios não configurado (DISCORD_ANNOUNCEMENTS_CHANNEL_ID).'
  const text = input.text.trim()
  if (!text) return 'O anúncio está vazio.'
  await deps.post(
    deps.channelId,
    announcementMessage({ ...input, text }, deps.iconUrl),
    input.pingEveryone,
  )
  return `Anúncio postado em <#${deps.channelId}>.`
}

/**
 * Registers `/anunciar` in the configured server once the gateway is ready, and
 * answers it. A guild command shows up at once; a global one takes up to an hour.
 */
export function announceCommandOn(
  client: Client,
  log: Logger,
  deps: { guildId?: string; channelId?: string },
): void {
  client.once(Events.ClientReady, () => {
    if (!deps.guildId) {
      log.warn('announce', 'DISCORD_GUILD_ID is not set: /anunciar is not registered')
      return
    }
    void client.application?.commands
      .set([announceCommand.toJSON()], deps.guildId)
      .catch((error: unknown) => {
        log.error('announce', 'could not register /anunciar', {
          message: error instanceof Error ? error.message : String(error),
        })
      })
  })

  client.on(Events.InteractionCreate, (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'anunciar') return
    void handle(interaction).catch((error: unknown) => {
      log.error('announce', 'announcement failed', {
        message: error instanceof Error ? error.message : String(error),
      })
      void interaction
        .reply({ content: 'Não deu pra postar o anúncio agora.', flags: MessageFlags.Ephemeral })
        .catch(() => {})
    })
  })

  async function handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const reply = await announce(
      {
        allowed: interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false,
        text: interaction.options.getString('texto', true),
        title: interaction.options.getString('titulo'),
        pingEveryone: interaction.options.getBoolean('marcar_todos') ?? false,
      },
      {
        channelId: deps.channelId,
        iconUrl: client.user?.displayAvatarURL(),
        post: async (channelId, message, pingEveryone) => {
          const channel = await client.channels.fetch(channelId)
          if (!channel?.isSendable()) throw new Error('announcements channel is not sendable')
          await channel.send({
            ...message,
            allowedMentions: { parse: pingEveryone ? ['everyone'] : [] },
          })
        },
      },
    )
    await interaction.reply({ content: reply, flags: MessageFlags.Ephemeral })
  }
}
