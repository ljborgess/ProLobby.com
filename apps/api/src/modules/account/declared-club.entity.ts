import { Check, Entity, OneToOne, Opt, PrimaryKey, Property } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from './account.entity'

export const MAX_FREE_SLOTS = 10
export const MAX_CLUB_NAME_LENGTH = 20

/**
 * Dossier counterpart: `ClubeDeclarado` in docs/requisitos/03-dados.md — #229.
 *
 * What lets someone captain a side (RF-006): free slots ≥ the other humans of
 * the side. Self-declared, so it can be stale; the captain says so at the 30 s
 * confirmation and the lobby falls without blame. One per account.
 */
@Entity({ tableName: 'declared_club' })
@Check({
  name: 'declared_club_free_slots_check',
  expression: 'free_slots >= 0 and free_slots <= 10',
})
export class DeclaredClub {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @OneToOne(() => Account, { owner: true, unique: true, deleteRule: 'cascade' })
  account!: Account

  @Property({ type: 'smallint' })
  freeSlots!: number

  @Property({ length: MAX_CLUB_NAME_LENGTH })
  clubName!: string

  @Property()
  updatedAt: Date & Opt = new Date()
}
