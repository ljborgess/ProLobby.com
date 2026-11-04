import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'
import type { DiscordSupportMessageEvent } from '@prolobby/types'

import { encryptAtRest, readEvidenceEncryptionKey } from '../../common/security/evidence-encryption'
import { hashIdentity, readIdentityHmacSecret } from '../../common/security/identity-hmac'
import { Account } from '../account/account.entity'
import { ModerationCase } from '../moderation/moderation-case.entity'
import { ModerationCaseOrigin, ModerationCaseType } from '../moderation/moderation-case.enums'

/**
 * RF-061: a message in #suporte-e-denuncia opens a case, so a moderator reads
 * Discord and the platform in one panel. `ModerationCaseAnnouncer` tells
 * #casos-moderacao on its own, like every other case.
 *
 * The author is the account linked to that Discord, when there is one. The
 * Discord id itself is kept too, encrypted, so a moderator can answer someone
 * with no account at all.
 *
 * ponytail: no dedupe on the bot event id — the bot does not retry this event,
 * and a rare double post costs a moderator one dismissal.
 */
@Injectable()
export class SupportIntakeService {
  private readonly hmacSecret = readIdentityHmacSecret()
  private readonly encryptionKey = readEvidenceEncryptionKey()

  constructor(private readonly em: EntityManager) {}

  async open(event: DiscordSupportMessageEvent): Promise<void> {
    const em = this.em.fork()
    const author = await em.findOne(Account, {
      discordIdHash: hashIdentity(this.hmacSecret, event.payload.discordId),
    })
    em.create(ModerationCase, {
      type: ModerationCaseType.SUPPORT_REQUEST,
      origin: ModerationCaseOrigin.DISCORD_MESSAGE,
      openedBy: author ?? undefined,
      reportMessage: event.payload.content,
      discordIdEncrypted: encryptAtRest(this.encryptionKey, Buffer.from(event.payload.discordId)),
      openedAt: new Date(event.occurredAt),
    })
    await em.flush()
  }
}
