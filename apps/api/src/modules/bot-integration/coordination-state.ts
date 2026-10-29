import { Injectable } from '@nestjs/common'

/** Why the queue closes no new lobby right now (RNF-008, RF-053, #271). */
export type QueuePause = 'discord_unavailable' | 'channels_full' | 'lobbies_full'

/** The bot reports every minute; three missed reports and it counts as gone. */
export const BOT_STATUS_STALE_MS = 3 * 60 * 1000
/** Discord's ceiling per server. */
export const DISCORD_CHANNEL_CAP = 500
const CHANNELS_PER_LOBBY = 3
/** RNF-004 sizes the system for 10 at once; at 9 the queue pauses. */
export const LOBBY_CAPACITY = 10
export const LOBBY_PAUSE_AT = LOBBY_CAPACITY - 1

/**
 * Whether a new lobby could be coordinated — #271, RNF-008. Fed by the bot's
 * heartbeat (`bot.status`) and by the matching run's count of lobbies at
 * once; read by the matching run, to close no lobby, and by `GET /queue`, to
 * tell the searching screen why.
 *
 * In memory on purpose: the heartbeat arrives every minute and must not wake
 * Neon for it (ADR-009), and losing it on a restart only means waiting for
 * the next report.
 *
 * Without a bot (local development, the e2e suites) the queue still runs: a
 * missing heartbeat pauses it only in production, where the bot is always
 * there. A report that says Discord is down pauses it anywhere.
 *
 * ponytail: one API process (ADR-009); a second one would keep its own copy.
 */
@Injectable()
export class CoordinationState {
  private bot: { discordReady: boolean; channelCount: number; at: number } | null = null
  private lobbiesFull = false
  private readonly requireBot = process.env.NODE_ENV === 'production'

  recordBot(status: { discordReady: boolean; channelCount: number }, now: number): void {
    this.bot = { ...status, at: now }
  }

  recordLobbies(active: number): void {
    this.lobbiesFull = active >= LOBBY_PAUSE_AT
  }

  /** The bot's side only: Discord out of reach, or no room for three channels. */
  botPause(now: number): QueuePause | null {
    if (!this.bot || now - this.bot.at > BOT_STATUS_STALE_MS) {
      return this.requireBot ? 'discord_unavailable' : null
    }
    if (!this.bot.discordReady) return 'discord_unavailable'
    if (this.bot.channelCount + CHANNELS_PER_LOBBY > DISCORD_CHANNEL_CAP) return 'channels_full'
    return null
  }

  /** Why no lobby closes now, as of the last report and the last matching run. */
  pause(now: number): QueuePause | null {
    return this.botPause(now) ?? (this.lobbiesFull ? 'lobbies_full' : null)
  }
}
