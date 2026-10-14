import { Entity, Enum, Index, ManyToOne, Opt, PrimaryKey, Property } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from '../account/account.entity'
import { LobbySide } from './lobby-participation.entity'
import { Lobby } from './lobby.entity'

export enum CaptainOfferOutcome {
  CONFIRMED = 'confirmed',
  /** Said no, or that the club filled up: either way, next in line. */
  DECLINED = 'declined',
  /** The 30 s ran out with no answer. */
  EXPIRED = 'expired',
  /** Confirmed, then gave the role up before the other side did (RF-032). */
  WITHDRAWN = 'withdrawn',
}

/**
 * One step of the captain cascade (#247): the role offered to one human of
 * one side, with 30 s to answer. The pending offer of a side is the row with
 * no outcome; everyone with a row in this lobby is out of that side's line,
 * whatever they answered. No penalty is ever derived from these rows
 * (RF-032).
 */
@Entity({ tableName: 'captain_offer' })
@Index({ properties: ['lobby', 'side'] })
export class CaptainOffer {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @ManyToOne(() => Lobby, { deleteRule: 'cascade' })
  lobby!: Lobby

  @Enum({ items: () => LobbySide })
  side!: LobbySide

  @ManyToOne(() => Account, { deleteRule: 'cascade' })
  account!: Account

  @Property()
  offeredAt!: Date

  @Enum({ items: () => CaptainOfferOutcome, nullable: true })
  outcome?: CaptainOfferOutcome

  @Property({ nullable: true })
  answeredAt?: Date

  /**
   * Declared that the club filled up after the last update. It changes
   * nothing here, but #248 reads it: an invite that never came from a captain
   * who said so is no fault, not abuse.
   */
  @Property({ default: false })
  declaredFull: boolean & Opt = false
}
