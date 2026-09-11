import { Entity, Enum, ManyToOne, Opt, PrimaryKey, Property } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from './account.entity'

export enum PaymentEventType {
  FOUNDER = 'founder',
  SUPPORTER = 'supporter',
}

/**
 * Minimal record of a support payment.
 *
 * Dossier counterpart: `EventoPagamento` in
 * docs/requisitos/03-dados.md#eventopagamento.
 *
 * No billing logic ships with it: confirmation is manual, over PIX, from the
 * moderation panel (phase 5). The table exists now only so that adding it
 * later is not a migration over accounts that already paid.
 *
 * The PIX receipt itself is *never* stored — it carries the payer's full name
 * and bank. Only value, date, type and the account stay, for the 5 years tax
 * law requires (docs/produto/04-governanca/02-lgpd.md). That is also why this
 * table has no link to screenshots, photos or match history: an account
 * deletion must be able to wipe the game data without touching what the law
 * forces us to keep.
 */
@Entity({ tableName: 'payment_event' })
export class PaymentEvent {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @ManyToOne(() => Account, { deleteRule: 'set null', nullable: true, index: true })
  account?: Account

  @Enum({ items: () => PaymentEventType })
  type!: PaymentEventType

  /**
   * Decimal, never float: money in binary floating point drifts, and this row
   * is fiscal record. MikroORM maps it to string in JS for the same reason.
   */
  @Property({ type: 'decimal', precision: 10, scale: 2 })
  amount!: string

  /** The moderator who confirmed the PIX — the action is human, and audited. */
  @ManyToOne(() => Account, { nullable: true, deleteRule: 'set null' })
  confirmedBy?: Account

  @Property({ nullable: true })
  confirmedAt?: Date

  @Property()
  createdAt: Date & Opt = new Date()
}
