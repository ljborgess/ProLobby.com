import { Entity, Enum, ManyToOne, Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Platform } from '../../common/domain/platform.enum'
import { Account } from '../account/account.entity'

/**
 * One gamertag per platform per account — `GamertagPlataforma` in
 * docs/requisitos/03-dados.md. A PSN ID and an Xbox gamertag are different
 * names, and the print is checked against the tag of the character's platform.
 *
 * Hash + ciphertext, like the Discord ID: the hash (same secret as
 * `BlockedIdentity`) is the key for uniqueness and the ban check, the
 * ciphertext is what the moderator reads.
 *
 * Exclusivity is born with verification, not with typing: while `verifiedAt`
 * is null the claim is provisional and blocks nobody, otherwise typing someone
 * else's tag would squat it. The migration holds the partial unique index on
 * (platform, gamertag_hash) where verified.
 */
export const VERIFIED_GAMERTAG_UNIQUE_INDEX = 'platform_gamertag_verified_unique'

@Entity({ tableName: 'platform_gamertag' })
@Unique({ properties: ['account', 'platform'] })
// Byte-identical to migration 20260924133630 (see `character.entity.ts`).
@Unique({
  name: VERIFIED_GAMERTAG_UNIQUE_INDEX,
  expression: `create unique index "${VERIFIED_GAMERTAG_UNIQUE_INDEX}" on "platform_gamertag" ("platform", "gamertag_hash") where ("verified_at" is not null)`,
})
export class PlatformGamertag {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @ManyToOne(() => Account, { deleteRule: 'cascade' })
  account!: Account

  @Enum({ items: () => Platform })
  platform!: Platform

  @Property({ length: 64, hidden: true })
  gamertagHash!: string

  @Property({ type: 'blob', hidden: true })
  gamertagEncrypted!: Buffer

  @Property({ nullable: true })
  verifiedAt?: Date

  @Property()
  createdAt: Date & Opt = new Date()
}
