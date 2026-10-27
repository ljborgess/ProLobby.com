import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  type Client,
  type Guild,
} from 'discord.js'

import type { LobbyChannelsDeps } from '../webhook/handlers/lobby-closed'

/**
 * The lobby channels on the real server (#250). Private by overwrite: the
 * server's @everyone cannot see them, each listed human can, and so can the
 * bot, which has to keep managing them until the #251 deletes them.
 *
 * `DISCORD_LOBBY_CATEGORY_ID`, when set, is where they go; without it they
 * land at the top of the server.
 */
export function lobbyChannelsOn(client: Client): Omit<LobbyChannelsDeps, 'report'> {
  const guild = (): Guild => {
    const configured = process.env.DISCORD_GUILD_ID
    const found = configured ? client.guilds.cache.get(configured) : client.guilds.cache.first()
    if (!found) throw new Error('no guild to open lobby channels in')
    return found
  }

  return {
    findChannel: async (name) => {
      const channels = await guild().channels.fetch()
      return channels.find((channel) => channel?.name === name) ?? null
    },
    createChannel: async ({ name, kind, members }) => {
      const server = guild()
      const use =
        kind === 'voice'
          ? [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak,
            ]
          : [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ]
      return server.channels.create({
        name,
        type: kind === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText,
        parent: process.env.DISCORD_LOBBY_CATEGORY_ID,
        permissionOverwrites: [
          { id: server.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          {
            id: client.user!.id,
            type: OverwriteType.Member,
            allow: [...use, PermissionFlagsBits.ManageChannels],
          },
          ...members.map((id) => ({ id, type: OverwriteType.Member, allow: use })),
        ],
      })
    },
    send: async (channelId, content, mentions) => {
      const channel = await client.channels.fetch(channelId)
      if (!channel?.isSendable()) {
        throw new Error(`channel ${channelId} is not one the bot can post in`)
      }
      await channel.send({ content, allowedMentions: { users: mentions } })
    },
  }
}
