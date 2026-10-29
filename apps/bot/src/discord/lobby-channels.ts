import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  type Client,
  type Guild,
  type GuildBasedChannel,
} from 'discord.js'

import { randomUUID } from 'node:crypto'
import type { BotEvent } from '@prolobby/types'

import type { Logger } from '../logger'
import { postBotEvent } from '../platform/client'
import type { LobbyChannelsDeps } from '../webhook/handlers/lobby-closed'
import type { LobbyEndedDeps } from '../webhook/handlers/lobby-ended'
import { CHANNEL_ALERT_AT, lobbyGroups, sweep } from './lobby-sweep'

const SWEEP_INTERVAL_MS = 60 * 1000

function guildOf(client: Client): Guild {
  const configured = process.env.DISCORD_GUILD_ID
  const found = configured ? client.guilds.cache.get(configured) : client.guilds.cache.first()
  if (!found) throw new Error('no guild to manage lobby channels in')
  return found
}

/**
 * The lobby channels on the real server (#250). Private by overwrite: the
 * server's @everyone cannot see them, each listed human can, and so can the
 * bot, which has to keep managing them until the #251 deletes them.
 *
 * `DISCORD_LOBBY_CATEGORY_ID`, when set, is where they go; without it they
 * land at the top of the server.
 */
export function lobbyChannelsOn(
  client: Client,
): Omit<LobbyChannelsDeps, 'report'> & LobbyEndedDeps {
  const guild = () => guildOf(client)

  return {
    deleteChannel: async (channelId) => {
      await guild().channels.delete(channelId)
    },
    findChannel: async (name) => {
      const channels = await guild().channels.fetch()
      // Only what the bot made: a person's channel with the same name is not ours.
      return (
        channels.find((channel) => channel?.name === name && isOwnedBy(client, channel)) ?? null
      )
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
    isSilent: async (channelId) => {
      const channel = await client.channels.fetch(channelId)
      if (!channel?.isTextBased()) return false
      return (await channel.messages.fetch({ limit: 1 })).size === 0
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

/**
 * Every minute, from the gateway's cache — no API call and no database
 * until something is due (#251). Deletes the channels of lobbies whose calls
 * have been empty for 10 min (15 min floor, 3 h ceiling), which is also the
 * hourly cleanup of RF-054: a channel the normal path missed (a lost
 * `lobby.ended`, a restart) is swept on the same rule. Crossing 400 channels
 * tells `DISCORD_STATUS_CHANNEL_ID` once, until the count drops back. Each
 * pass starts with the heartbeat the API pauses the queue on (#271).
 */
export function scheduleLobbySweep(
  client: Client,
  log: Logger,
  report: (event: BotEvent) => Promise<{ status: number }> = postBotEvent,
): () => void {
  const emptySince = new Map<string, number>()
  let alerted = false
  let running = false

  const run = async () => {
    const server = guildOf(client)
    // Threads do not count towards the 500, and are never lobby channels.
    const all = [...server.channels.cache.values()].filter((channel) => !channel.isThread())
    // The heartbeat first (#271): the API stops closing lobbies when it goes
    // quiet, says Discord is down, or three more channels would pass 500.
    await report({
      id: randomUUID(),
      occurredAt: new Date().toISOString(),
      type: 'bot.status',
      payload: { discordReady: client.isReady(), channelCount: all.length },
    })
      .then(({ status }) => {
        // A refused heartbeat (wrong secret, 400, 429) pauses the queue in
        // production just like a silent bot: say it here, not only there.
        if (status !== 204) log.warn('lobby', 'bot status refused', { status })
      })
      .catch((error: unknown) => {
        log.warn('lobby', 'bot status not delivered', {
          message: error instanceof Error ? error.message : String(error),
        })
      })
    const channels = all
      // Only what the bot made: a person's channel called "lobby-…" is not ours to delete.
      .filter((channel) => isOwnedBy(client, channel))
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        createdAt: channel.createdTimestamp ?? Date.now(),
        voiceMembers: channel.isVoiceBased() ? channel.members.size : null,
      }))
    for (const group of sweep(lobbyGroups(channels), emptySince, Date.now())) {
      for (const id of group.channelIds) {
        // One already gone (a `lobby.ended` got there first) must not stop the rest.
        await server.channels.delete(id).catch((error: unknown) => {
          log.warn('lobby', 'lobby channel not deleted', {
            channelId: id,
            message: error instanceof Error ? error.message : String(error),
          })
        })
      }
      log.info('lobby', 'lobby channels deleted', { tag: group.tag })
    }

    const count = all.length
    if (count >= CHANNEL_ALERT_AT && !alerted) {
      alerted = true
      log.warn('lobby', 'channel count past the alert line', { count })
      const status = process.env.DISCORD_STATUS_CHANNEL_ID
      const channel = status ? await client.channels.fetch(status) : null
      if (channel?.isSendable()) {
        await channel.send({
          content: `O servidor tem **${count} canais** (o Discord para em 500). Confira se a faxina dos lobbies está rodando.`,
          allowedMentions: { parse: [] },
        })
      }
    } else if (count < CHANNEL_ALERT_AT) {
      alerted = false
    }
  }

  const tick = () => {
    // A slow pass (many deletes) never overlaps the next one.
    if (running) return
    running = true
    run()
      .catch((error: unknown) => {
        log.error('lobby', 'lobby channel sweep failed', {
          message: error instanceof Error ? error.message : String(error),
        })
      })
      .finally(() => {
        running = false
      })
  }
  // Once now, so the API hears from the bot as soon as it is ready.
  tick()
  const timer = setInterval(tick, SWEEP_INTERVAL_MS)
  return () => clearInterval(timer)
}

/** Made by this bot: it gives itself an overwrite on every lobby channel it creates. */
export function isOwnedBy(client: Client, channel: GuildBasedChannel): boolean {
  const me = client.user?.id
  return !!me && 'permissionOverwrites' in channel && channel.permissionOverwrites.cache.has(me)
}
