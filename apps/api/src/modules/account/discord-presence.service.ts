import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'
import type { BotEvent } from '@prolobby/types'

import { hashIdentity, readIdentityHmacSecret } from '../../common/security/identity-hmac'
import { Account } from './account.entity'

/**
 * Applies "this Discord user left / joined the server" to the account it belongs
 * to — RF-060, #150.
 *
 * It never touches the link: `discordIdHash` and `discordIdEncrypted` stay as
 * they are in both directions, because leaving the server is not unlinking
 * (RF-060, RF-082).
 *
 * One UPDATE does the whole job, and each property the issue asks for falls out
 * of it instead of being a branch:
 *
 * - **unknown Discord** matches zero rows — no error, and nothing that tells the
 *   caller whether the id exists here;
 * - **duplicate delivery** rewrites the same values — the result does not change;
 * - **out-of-order delivery** is refused by the `discordPresenceAt` guard: a
 *   "left" that was delayed past a later "joined" matches zero rows too, instead
 *   of locking the person out until the next event.
 */
@Injectable()
export class DiscordPresenceService {
  // Read at boot, like the secret every other identity column uses: a missing
  // secret must stop the process, not fail the first event that arrives.
  private readonly hmacSecret = readIdentityHmacSecret()

  constructor(private readonly em: EntityManager) {}

  async apply(event: BotEvent): Promise<void> {
    if (event.type === 'discord.presence_snapshot') {
      await this.applySnapshot(event.payload.discordIds, new Date(event.occurredAt))
      return
    }

    const at = new Date(event.occurredAt)

    await this.em.fork().nativeUpdate(
      Account,
      {
        discordIdHash: hashIdentity(this.hmacSecret, event.payload.discordId),
        $or: [{ discordPresenceAt: null }, { discordPresenceAt: { $lte: at } }],
      },
      { discordPresent: event.type === 'discord.member_joined', discordPresenceAt: at },
    )
  }

  /**
   * The whole membership, treated as ground truth for this instant — not a
   * delta like `apply()` above. Closes two gaps `left`/`joined` cannot
   * (2026-09-23 review):
   *
   * - **linked while already outside the server** — no "left" ever fires for
   *   someone who was never seen joining by this bot process, so `apply()`
   *   alone leaves `discordPresent` at its default forever;
   * - **left or rejoined while the bot was down** — no listener was running
   *   to see it.
   *
   * No `discordPresenceAt` ordering guard here on purpose: a snapshot is not
   * a delayed delivery of a past fact, it is "this is who is in the server
   * right now", so it always wins over whatever an older delta left behind.
   * Sent on every reconnect and on a timer, so a dropped or duplicate
   * snapshot only costs staleness until the next one — never a permanent
   * wrong answer.
   */
  async applySnapshot(discordIds: string[], at: Date): Promise<void> {
    const hashes = discordIds.map((id) => hashIdentity(this.hmacSecret, id))
    const em = this.em.fork()

    await em.transactional(async (trx) => {
      await trx.nativeUpdate(
        Account,
        { discordIdHash: { $in: hashes } },
        { discordPresent: true, discordPresenceAt: at },
      )
      await trx.nativeUpdate(
        Account,
        { discordIdHash: { $nin: hashes }, discordPresent: true },
        { discordPresent: false, discordPresenceAt: at },
      )
    })
  }
}
