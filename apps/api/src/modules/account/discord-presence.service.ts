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
}
