import { Entity, Enum, Index, ManyToOne, Opt, PrimaryKey, Property } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from '../account/account.entity'
import { ReputationEventReason } from './ranking-event.enums'

/**
 * Every reputation change, with its reason, origin match and date.
 *
 * Dossier counterpart: `EventoReputacao` in
 * docs/requisitos/03-dados.md — the entity ADR-002 exists for.
 *
 * Storing only the current value makes three decided rules impossible, not
 * merely harder:
 *
 * 1. Rollback of a disputed match — you cannot undo what was never recorded.
 * 2. Rolling 30-day counters — a single number cannot answer "how many in the
 *    last 30 days".
 * 3. The cap of 70 on recovery — applying it needs the origin of each gain.
 *
 * Retention is indefinite (docs/produto/04-governanca/02-lgpd.md): this log
 * is what backs the current number, so deleting it breaks the traceability of
 * the value itself. It is not ephemeral data like a screenshot.
 */
@Entity({ tableName: 'reputation_event' })
@Index({ properties: ['account', 'createdAt'] })
export class ReputationEvent {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @ManyToOne(() => Account, { deleteRule: 'cascade' })
  account!: Account

  /** Signed: +1 for a clean match, −8 for a disconnect. */
  @Property({ type: 'smallint' })
  delta!: number

  @Enum({ items: () => ReputationEventReason })
  reason!: ReputationEventReason

  /**
   * Origin lobby, when there is one. Plain uuid, no foreign key yet: the
   * lobby table only exists in phase 3. The constraint is added there — see
   * the note in docs/requisitos/03-dados.md.
   */
  @Property({ type: 'uuid', nullable: true })
  lobbyId?: string

  /**
   * A reverted event is *marked*, never deleted: erasing it would also erase
   * the repeat-offence history of someone who did nothing wrong, which is the
   * opposite of what the rollback is for.
   */
  @Property({ nullable: true })
  revertedAt?: Date

  @Property()
  createdAt: Date & Opt = new Date()
}
