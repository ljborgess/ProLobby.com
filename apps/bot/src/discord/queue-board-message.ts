import type { Client } from 'discord.js'

import { BOARD_PLATE } from '../webhook/handlers/queue-status'
import type { BotMessage } from './brand'

/**
 * The single board message in #fila-status, edited in place so the channel
 * reads as a scoreboard, not a log. Its id is remembered; after a restart the
 * bot finds its own last board among the recent messages before posting anew.
 */
export function queueBoardMessageOn(client: Client) {
  let boardId: string | undefined

  async function channelOf(channelId: string) {
    const channel = await client.channels.fetch(channelId)
    if (!channel?.isTextBased() || !channel.isSendable()) {
      throw new Error(`channel ${channelId} is not one the bot can post in`)
    }
    return channel
  }

  return {
    iconUrl: () => client.user?.displayAvatarURL(),
    async upsertBoard(channelId: string, message: BotMessage): Promise<void> {
      const channel = await channelOf(channelId)
      if (!boardId) {
        const recent = await channel.messages.fetch({ limit: 20 })
        boardId = recent.find(
          (m) => m.author.id === client.user?.id && m.embeds[0]?.author?.name === BOARD_PLATE,
        )?.id
      }
      const body = { ...message, content: message.content ?? '', allowedMentions: { parse: [] } }
      if (boardId) {
        try {
          await channel.messages.edit(boardId, body)
          return
        } catch {
          boardId = undefined // deleted by hand: post a fresh one
        }
      }
      boardId = (await channel.send(body)).id
    },
    async post(channelId: string, message: BotMessage): Promise<void> {
      const channel = await channelOf(channelId)
      await channel.send({ ...message, allowedMentions: { parse: [] } })
    },
  }
}
