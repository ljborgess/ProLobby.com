import { Entity, Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

/**
 * An email address waiting for sign-up to reopen — RF-072, RF-078.
 *
 * Deliberately not linked to `Account`: joining the list never creates one,
 * and never will — a refused sign-up has no account to attach this to.
 *
 * Retention is 90 days or reopening, whichever comes first (RF-078), but
 * nothing in this slice deletes rows: there is no scheduler yet (#106) to run
 * that job or to send the reopening email itself. `createdAt` is what that
 * future job filters and expires by; until it exists, a stale row here is
 * inert — it is never read, so it never leaks or notifies anyone.
 */
@Entity({ tableName: 'waiting_list_entry' })
export class WaitingListEntry {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  /**
   * One row per address: joining twice while sign-up stays paused is the same
   * intent expressed twice, not two people to email later.
   */
  @Property({ length: 320 })
  @Unique()
  email!: string

  @Property()
  createdAt: Date & Opt = new Date()
}
