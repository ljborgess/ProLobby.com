import { Entity, Index, ManyToOne, Opt, PrimaryKey, Property } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from './account.entity'

/**
 * A pending password reset — RF-024.
 *
 * Same shape as EmailVerification, and the token is hashed for a stronger
 * reason: a leaked verification token confirms an address, a leaked reset
 * token hands over the account. A database leak must not hand over every
 * reset still pending.
 */
@Entity({ tableName: 'password_reset' })
export class PasswordReset {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @ManyToOne(() => Account, { deleteRule: 'cascade', index: true })
  account!: Account

  /** SHA-256 of the token that travelled by email. Lookup is by this value. */
  @Property({ length: 64 })
  @Index()
  tokenHash!: string

  /** 30 minutes after issue — RF-024. */
  @Property()
  expiresAt!: Date

  /**
   * Set when the link is used, and also when it goes stale — a newer link was
   * requested, or another link completed the reset.
   *
   * Rows are kept rather than deleted: the per-account limit counts links
   * issued in the last hour, used or not.
   */
  @Property({ nullable: true })
  usedAt?: Date

  @Property()
  createdAt: Date & Opt = new Date()
}
