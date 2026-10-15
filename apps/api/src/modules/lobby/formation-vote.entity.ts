import { Entity, ManyToOne, Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from '../account/account.entity'
import { Lobby } from './lobby.entity'

/**
 * The formations a side can vote (#249): all keep the fixed shape of the
 * queue — GK 1, DEF 4, MID 2, WING 2, ST 2 (docs/produto/03-partida/02-fila.md).
 * The three the dossier names; more join when someone asks for them.
 */
export const FORMATIONS = ['4-3-3', '4-4-2', '4-2-3-1'] as const
export type Formation = (typeof FORMATIONS)[number]

/**
 * One human's vote in their own side (RF-034). One row per person, changed
 * in place until the 60 s end. The side comes from the participation, never
 * from the request.
 */
@Entity({ tableName: 'formation_vote' })
@Unique({ properties: ['lobby', 'account'] })
export class FormationVote {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @ManyToOne(() => Lobby, { deleteRule: 'cascade' })
  lobby!: Lobby

  @ManyToOne(() => Account, { deleteRule: 'cascade' })
  account!: Account

  @Property({ length: 12 })
  formation!: string

  @Property()
  votedAt!: Date
}
