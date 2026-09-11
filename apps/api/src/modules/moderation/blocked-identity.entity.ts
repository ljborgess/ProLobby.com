import { Entity, Enum, Index, ManyToOne, Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Platform } from '../../common/domain/platform.enum'
import { ModerationCase } from './moderation-case.entity'

/**
 * Identities barred from coming back, kept as hashes.
 *
 * Dossier counterpart: `IdentidadeBloqueada` in
 * docs/requisitos/03-dados.md#identidadebloqueada — RF-079.
 *
 * Why it exists: a ban used to be tied to the Discord ID and gamertag stored
 * *on the account*, and an LGPD deletion wipes the account and frees the
 * email. Asking for deletion right after a ban was a clean way back in, with
 * the same Discord and the same gamertag.
 *
 * Why hashes: the block has to survive deletion, but keeping readable
 * personal data of someone who asked to be deleted would defeat the request.
 * An HMAC with a server-side secret answers "is this identity blocked?"
 * without storing the identity. Legal basis is exercise of a right, not
 * consent — so the data subject cannot revoke it.
 *
 * The secret is the *same* one used by `PlatformGamertag` (phase 2.2) and by
 * the account's `discordIdHash` (phase 2.3): a different secret per table
 * would make the same person hash to different values, and the block would
 * silently stop matching.
 */
@Entity({ tableName: 'blocked_identity' })
@Unique({ properties: ['platform', 'gamertagHash'] })
export class BlockedIdentity {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  /** HMAC of the Discord ID. Null when the ban came from a gamertag only. */
  @Property({ length: 64, nullable: true })
  @Unique()
  discordIdHash?: string

  /** HMAC of the gamertag, scoped by platform — identity is the pair. */
  @Property({ length: 64, nullable: true })
  gamertagHash?: string

  @Enum({ items: () => Platform, nullable: true })
  platform?: Platform

  @Property({ type: 'text' })
  reason!: string

  /** The case that produced the ban — auditability of a permanent decision. */
  @ManyToOne(() => ModerationCase, { nullable: true, deleteRule: 'set null' })
  case?: ModerationCase

  @Property()
  @Index()
  createdAt: Date & Opt = new Date()
}
