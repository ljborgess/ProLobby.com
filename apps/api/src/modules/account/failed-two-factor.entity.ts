import { Entity, Index, ManyToOne, Opt, PrimaryKey, Property } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from './account.entity'

/**
 * A wrong second-factor code (#311) — its own counter, apart from
 * `FailedSignIn`. A correct password clears the sign-in window, and sharing
 * it would let whoever holds a leaked password reset the guess limit on the
 * 6-digit code by signing in again between batches.
 */
@Entity({ tableName: 'failed_two_factor' })
@Index({ properties: ['account', 'createdAt'] })
export class FailedTwoFactor {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @ManyToOne(() => Account, { deleteRule: 'cascade' })
  account!: Account

  @Property()
  createdAt: Date & Opt = new Date()
}
