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
 * The whole membership, right now — closes what left/joined cannot (see the
 * schema comment in `bot-event.ts`). Call once on `ClientReady` and on a
 * timer (`schedulePresenceSnapshots`): a reconnect after downtime and a
 * periodic tick are the two moments something could have drifted with no
 * event to say so.
 */
export async function reportPresenceSnapshot(
  client: Client,
  log: Logger,
  post: (event: BotEvent) => Promise<{ status: number }> = postBotEvent,
): Promise<void> {
  const configured = process.env.DISCORD_GUILD_ID
  const guilds = configured
    ? client.guilds.cache.filter((guild) => guild.id === configured)
    : client.guilds.cache

  if (guilds.size === 0) {
    // Not yet in any guild the bot recognises (e.g. between invite and the
    // first GUILD_CREATE), or DISCORD_GUILD_ID misconfigured. Either way, an
    // empty snapshot here would tell the API "nobody is present" and flip
    // every linked account to blocked — worse than skipping this round.
    log.error('presence', 'no guild to snapshot — skipping instead of reporting empty presence')
    return
  }

  const discordIds: string[] = []
  let failedGuilds = 0

  for (const guild of guilds.values()) {
    try {
      const members = await guild.members.fetch()
      for (const member of members.values()) {
        if (!member.user.bot) {
          discordIds.push(member.user.id)
        }
      }
    } catch (error) {
      // One unreachable guild must not cancel the snapshot for the others —
      // skip it, log it, keep going. But if EVERY guild fails, falling
      // through would report an empty membership as ground truth and flip
      // every linked account to blocked; guarded below instead.
      failedGuilds += 1
      log.error('presence', 'could not fetch guild members for the snapshot', {
        guildId: guild.id,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (failedGuilds === guilds.size) {
    log.error(
      'presence',
      'every guild failed to fetch — skipping instead of reporting empty presence',
    )
    return
  }

  const event = {
    id: randomUUID(),
    occurredAt: new Date().toISOString(),
    type: 'discord.presence_snapshot',
    payload: { discordIds },
  } as BotEvent

  try {
    const { status } = await post(event)
    if (status >= 400) {
      log.error('presence', 'platform refused the snapshot', { status })
      return
    }
    log.info('presence', 'reported presence snapshot', { count: discordIds.length })
  } catch (error) {
    log.error('presence', 'could not reach the platform for the snapshot', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Repeats `reportPresenceSnapshot` on a timer — issue #150 follow-up. Returns
 * the handle so `index.ts` can `clearInterval` it on shutdown; `unref()` so a
 * pending tick never keeps the process alive on its own.
 */
export function schedulePresenceSnapshots(
  client: Client,
  log: Logger,
  intervalMs: number = PRESENCE_SNAPSHOT_INTERVAL_MS,
  post: (event: BotEvent) => Promise<{ status: number }> = postBotEvent,
): NodeJS.Timeout {
  const timer = setInterval(() => void reportPresenceSnapshot(client, log, post), intervalMs)
  timer.unref()
  return timer
}

export const PRESENCE_SNAPSHOT_INTERVAL_MS = 15 * 60 * 1000

/**
 * The one guild that counts.
 *
 * Required in production (2026-09-23 review): left optional, a bot invited to
 * a second server — a test one, or one it was added to by mistake — blocks or
 * frees real accounts based on what happens over there. Outside production,
 * unset still means "every guild counts", so local dev and CI need nothing.
 */
export function readDiscordGuildId(): string | undefined {
  const configured = process.env.DISCORD_GUILD_ID
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error(
      'DISCORD_GUILD_ID is required in production — RF-060 must not let a second guild the bot is in affect real accounts',
    )
  }
  return configured
}

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
