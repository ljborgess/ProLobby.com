import { Entity, Index, ManyToOne, Opt, PrimaryKey, Property } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from './account.entity'

/**
 * A pending email verification — RF-002 (a verified address gates the queue).
 *
 * The token is stored **hashed**, never in the clear: a database leak would
 * otherwise hand over every pending verification, letting someone claim
 * addresses they do not own. Same reasoning as a password, for a value that
 * grants the same thing a password grants.
 */
@Entity({ tableName: 'email_verification' })
export class EmailVerification {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID()

  @ManyToOne(() => Account, { deleteRule: 'cascade', index: true })
  account!: Account

  /** SHA-256 of the token that travelled by email. Lookup is by this value. */
  @Property({ length: 64 })
  @Index()
  tokenHash!: string

  /**
   * 24 hours — far longer than the 30 minutes of a password reset link, and
   * deliberately so: a leaked verification link merely confirms an address,
   * while a leaked reset link hands over the account.
   */
  @Property()
  expiresAt!: Date

  /**
   * Set when used. The row is kept rather than deleted so a second click on
   * the same link can answer "already verified" instead of "invalid link" —
   * which is what people actually do, and what would otherwise look like a bug.
   */
  @Property({ nullable: true })
  usedAt?: Date

  @Property()
  createdAt: Date & Opt = new Date()
}
