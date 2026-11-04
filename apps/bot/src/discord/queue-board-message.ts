import { DiscordAPIError, RESTJSONErrorCodes, type Client } from 'discord.js'

import { BOARD_PLATE } from '../webhook/handlers/queue-status'
import type { BotMessage } from './brand'

/**
 * The single board message in #fila-status, edited in place so the channel
 * reads as a scoreboard, not a log. It is pinned when posted: after a restart
 * the bot finds it among the pins, however many lobby cards came after it.
 *
 * Only "Unknown Message" (deleted by hand) makes a new board. Any other
 * failure — a 5xx, a timeout — is thrown, and the next update tries the same
 * message again instead of piling up duplicates.
 */
export function queueBoardMessageOn(client: Client) {
  let boardId: string | undefined

  async function channelOf(channelId: string) {
    const channel = await client.channels.fetch(channelId)
    if (!channel?.isTextBased() || !channel.isSendable() || !('messages' in channel)) {
      throw new Error(`channel ${channelId} is not one the bot can post in`)
    }
    return channel
  }

  return {
    iconUrl: () => client.user?.displayAvatarURL(),
    async upsertBoard(channelId: string, message: BotMessage): Promise<void> {
      const channel = await channelOf(channelId)
      if (!boardId) {
        const pinned = await channel.messages.fetchPinned()
        boardId = pinned.find(
          (m) => m.author.id === client.user?.id && m.embeds[0]?.author?.name === BOARD_PLATE,
        )?.id
      }
      // attachments: [] drops the previous picture; files brings the new one.
      const body = {
        ...message,
        content: message.content ?? '',
        attachments: [],
        allowedMentions: { parse: [] },
      }
      if (boardId) {
        try {
          await channel.messages.edit(boardId, body)
          return
        } catch (error) {
          if (
            !(error instanceof DiscordAPIError) ||
            error.code !== RESTJSONErrorCodes.UnknownMessage
          ) {
            throw error
          }
          boardId = undefined
        }
      }
      const sent = await channel.send(body)
      boardId = sent.id
      await sent.pin().catch(() => {}) // without Manage Messages it still works, just not after a restart
    },
    async post(channelId: string, message: BotMessage): Promise<void> {
      const channel = await channelOf(channelId)
      await channel.send({ ...message, allowedMentions: { parse: [] } })
    },
  }
}
