import { Entity, ManyToOne, Opt, PrimaryKey, Property } from '@mikro-orm/core'
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
 */
@Entity({ tableName: 'terms_acceptance' })
export class TermsAcceptance {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @ManyToOne(() => Account, { deleteRule: 'cascade', index: true })
  account!: Account

  /** Published terms version, e.g. "2026-09-11". Opaque to the platform. */
  @Property({ length: 32 })
  version!: string

  @Property()
  acceptedAt: Date & Opt = new Date()
}
