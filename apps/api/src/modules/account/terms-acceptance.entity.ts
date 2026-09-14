import { Entity, ManyToOne, Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from './account.entity'

/**
 * One row per acceptance — never a column on the account.
 *
 * Dossier counterpart: `AceiteTos` in docs/requisitos/03-dados.md#aceitetos.
 *
 * A material change to the terms requires a fresh acceptance and blocks the
 * account until it happens (RF-026). A single column would answer "did they
 * accept?" but not "which version, and when" — and traceable consent is what
 * LGPD asks for in practice.
 *
 * Unique on (account, version): accepting the same version twice must leave one
 * row (RNF-018). The index enforces that under concurrency, where a
 * check-then-insert would let two simultaneous requests both write.
 */
@Entity({ tableName: 'terms_acceptance' })
@Unique({ properties: ['account', 'version'] })
export class TermsAcceptance {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  /**
   * Cascade here is deliberate, unlike the event log: an acceptance record
   * has no meaning without the person who accepted, and keeping it would
   * retain a link to a deleted account for no auditing gain.
   */
  @ManyToOne(() => Account, { deleteRule: 'cascade', index: true })
  account!: Account

  /** Published terms version, an ISO date — see terms.constants.ts. */
  @Property({ length: 32 })
  version!: string

  @Property()
  acceptedAt: Date & Opt = new Date()
}
