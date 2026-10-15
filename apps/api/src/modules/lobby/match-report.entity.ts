import { Entity, Enum, ManyToOne, Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from '../account/account.entity'
import { LobbySide } from './lobby-participation.entity'
import { Lobby } from './lobby.entity'

/**
 * Dossier counterpart: `Report` in docs/requisitos/03-dados.md — phase 4.1.
 *
 * One human's result for the lobby: the final screen print and the score
 * typed next to it. One per person; the score is corrected in place while
 * the other side has not answered (RF-042), the print never changes. The
 * side is copied from the participation when the report arrives.
 */
@Entity({ tableName: 'match_report' })
@Unique({ properties: ['lobby', 'account'] })
export class MatchReport {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @ManyToOne(() => Lobby, { deleteRule: 'cascade' })
  lobby!: Lobby

  /** Null after an LGPD deletion: the result of the match outlives the person. */
  @ManyToOne(() => Account, { nullable: true, deleteRule: 'set null' })
  account?: Account | null

  @Enum({ items: () => LobbySide })
  side!: LobbySide

  @Property()
  scoreA!: number

  @Property()
  scoreB!: number

  /** Every accepted print, ever: the same file never reports a second match. */
  @Property({ length: 64, unique: true })
  fileHash!: string

  /** Encrypted at rest; cleared after the 90-day retention, the hash stays. */
  @Property({ type: 'text', nullable: true })
  filePath?: string

  @Property()
  submittedAt!: Date

  @Property({ nullable: true })
  correctedAt?: Date
}
