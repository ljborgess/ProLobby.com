import { randomUUID } from 'node:crypto'
import { Events, type Client, type GuildMember, type PartialGuildMember } from 'discord.js'
import type { BotEvent } from '@prolobby/types'

import type { Logger } from '../logger'
import { postBotEvent } from '../platform/client'

/**
 * Tells the platform when a linked member leaves or rejoins the server —
 * RF-060, issue #150.
 *
 * The bot reports a fact ("this Discord user left"), never a rule: it does not
 * know who has an account, and the API answers 204 either way so this side can
 * never learn who is on the platform. Whether leaving blocks the queue is the
 * API's decision (`DiscordPresenceService`), and the link itself is never
 * touched in either direction — leaving the server is not unlinking (RF-082).
 *
 * `guildMemberRemove` fires for a leave, a kick and a ban alike. That is
 * correct here: all three mean the same thing to the queue, which is that the
 * bot can no longer reach this person to coordinate a match.
 */
export function reportPresence(
  client: Client,
  log: Logger,
  post: (event: BotEvent) => Promise<{ status: number }> = postBotEvent,
): void {
  client.on(Events.GuildMemberRemove, (member) => {
    void send(member, 'discord.member_left', log, post)
  })
  client.on(Events.GuildMemberAdd, (member) => {
    void send(member, 'discord.member_joined', log, post)
  })
}

/**
 * The one guild that counts, when it is configured.
 *
 * Unset means every guild counts, which is the single-server reality the
 * product describes. Setting it closes a real footgun: a bot invited to a test
 * server alongside the live one would otherwise block real accounts the moment
 * someone left the test server.
 */
function guildMatters(guildId: string): boolean {
  const configured = process.env.DISCORD_GUILD_ID
  return !configured || configured === guildId
}

async function send(
  member: GuildMember | PartialGuildMember,
  type: BotEvent['type'],
  log: Logger,
  post: (event: BotEvent) => Promise<{ status: number }>,
): Promise<void> {
  // A partial member still carries the user, which is all this needs — the id.
  // Bots joining and leaving are not people with accounts.
  if (member.user.bot || !guildMatters(member.guild.id)) {
    return
  }

  const event = {
    id: randomUUID(),
    // When it happened, as the bot saw it. The API uses this to refuse a
    // "left" that arrives after a later "joined", so a delayed delivery cannot
    // lock someone out.
    occurredAt: new Date().toISOString(),
    type,
    payload: { discordId: member.user.id },
  } as BotEvent

  try {
    const { status } = await post(event)

    if (status >= 400) {
      // ponytail: logged and dropped, not retried. The bot has no store to
      // queue a failed attempt in, and building one is a bigger slice than
      // this. The cost of a miss is bounded and self-correcting: a lost
      // "left" leaves someone queue-eligible until their next event, a lost
      // "joined" leaves them blocked until they leave and return. Give the
      // bot durable storage and this becomes a retry with the same payload —
      // the API is already idempotent, so redelivery is safe by construction.
      log.error('presence', 'platform refused the event', { type, status })
      return
    }

    log.info('presence', 'reported to the platform', { type })
  } catch (error) {
    log.error('presence', 'could not reach the platform', {
      type,
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
