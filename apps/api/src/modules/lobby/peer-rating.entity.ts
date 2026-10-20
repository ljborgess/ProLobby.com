import { Entity, Enum, Index, ManyToOne, Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from '../account/account.entity'
import { Lobby } from './lobby.entity'

export enum PeerRatingKind {
  THUMBS_UP = 'thumbs_up',
  NEGATIVE = 'negative',
}

/**
 * Dossier counterpart: `Avaliacao` in docs/requisitos/03-dados.md — phase 4.2.
 *
 * One teammate rating another after a finished match, once per pair. A
 * thumbs-up is +1 reputation at once; a negative only adds up
 * (docs/produto/02-jogador/02-ranking.md, "Avaliação por pares").
 */
@Entity({ tableName: 'peer_rating' })
@Unique({ properties: ['lobby', 'fromAccount', 'toAccount'] })
@Index({ properties: ['toAccount', 'createdAt'] })
export class PeerRating {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @ManyToOne(() => Lobby, { deleteRule: 'cascade' })
  lobby!: Lobby

  /** Null after an LGPD deletion: the thumbs-up keeps counting, with nobody behind it. */
  @ManyToOne(() => Account, { nullable: true, deleteRule: 'set null' })
  fromAccount?: Account | null

  @ManyToOne(() => Account, { deleteRule: 'cascade' })
  toAccount!: Account

  @Enum({ items: () => PeerRatingKind })
  kind!: PeerRatingKind

  @Property()
  createdAt: Date & Opt = new Date()
}
