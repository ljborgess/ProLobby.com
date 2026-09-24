import { Entity, Enum, Index, ManyToOne, Opt, PrimaryKey, Property } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Character } from '../character/character.entity'
import { EloEventReason } from './ranking-event.enums'

/**
 * Every elo change, per character.
 *
 * Dossier counterpart: `EventoElo` in docs/requisitos/03-dados.md.
 *
 * Separate from reputation on purpose: elo belongs to a character/category
 * and measures performance, reputation belongs to the account and measures
 * conduct (docs/produto/02-jogador/02-ranking.md). Merging them into one
 * table would force a nullable character on every conduct row.
 */
@Entity({ tableName: 'elo_event' })
@Index({ properties: ['character', 'createdAt'] })
export class EloEvent {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @ManyToOne(() => Character, { deleteRule: 'cascade' })
  character!: Character

  /** Signed, and never a fraction: K-factor is 32 or 20 (RF-077). */
  @Property({ type: 'smallint' })
  delta!: number

  @Enum({ items: () => EloEventReason })
  reason!: EloEventReason

  /** Origin lobby. Plain uuid until phase 3, same reason as above. */
  @Property({ type: 'uuid', nullable: true })
  lobbyId?: string

  @Property({ nullable: true })
  revertedAt?: Date

  @Property()
  createdAt: Date & Opt = new Date()
}
