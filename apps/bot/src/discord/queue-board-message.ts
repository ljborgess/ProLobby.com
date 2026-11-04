import type { Client } from 'discord.js'

import { BOARD_TITLE } from '../webhook/handlers/queue-status'

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
    async upsertBoard(channelId: string, content: string): Promise<void> {
      const channel = await channelOf(channelId)
      if (!boardId) {
        const recent = await channel.messages.fetch({ limit: 20 })
        boardId = recent.find(
          (message) =>
            message.author.id === client.user?.id && message.content.startsWith(BOARD_TITLE),
        )?.id
      }
      if (boardId) {
        try {
          await channel.messages.edit(boardId, { content, allowedMentions: { parse: [] } })
          return
        } catch {
          boardId = undefined // deleted by hand: post a fresh one
        }
      }
      const sent = await channel.send({ content, allowedMentions: { parse: [] } })
      boardId = sent.id
    },
    async post(channelId: string, content: string): Promise<void> {
      const channel = await channelOf(channelId)
      await channel.send({ content, allowedMentions: { parse: [] } })
    },
  }
}
