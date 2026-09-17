import { Entity, Index, ManyToOne, Opt, PrimaryKey, Property } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from './account.entity'

/**
 * One failed sign-in attempt — item 11 of the security checklist, RNF-011.
 *
 * The per-IP bucket stops one machine hammering the endpoint; it does nothing
 * against a thousand addresses trying the same account five times each. This
 * is the per-account half the checklist asks for ("por conta **e** por IP").
 *
 * A row per attempt, like PasswordReset, rather than a counter column on
 * Account: the limit is a moving window, and a counter would need its own
 * reset job to stop a mistyped password from accumulating for months. Rows in
 * the last N minutes answer the question directly, and the successful sign-in
 * clears them.
 *
 * Nothing about the password attempt is stored — not the value, not a hash of
 * it. The row records that an attempt failed, and when.
 */
@Entity({ tableName: 'failed_sign_in' })
@Index({ properties: ['account', 'createdAt'] })
export class FailedSignIn {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @ManyToOne(() => Account, { deleteRule: 'cascade' })
  account!: Account

  @Property()
  createdAt: Date & Opt = new Date()
}
