import { ConflictException } from '@nestjs/common'
import { Entity, Enum, ManyToOne, Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import type { EntityManager } from '@mikro-orm/postgresql'
import { randomUUID } from 'node:crypto'

import { Account } from '../account/account.entity'
import { CharacterCategory } from '../character/archetype'
import { Character } from '../character/character.entity'
import { Lobby } from '../lobby/lobby.entity'

/**
 * Dossier counterpart: `EntradaFila` in docs/requisitos/03-dados.md — #228.
 *
 * One per account (RF-001) is the unique index, not a check: two joins at
 * once must not both land. Leaving deletes the row; the match history lives
 * in the lobby, not here.
 */
@Entity({ tableName: 'queue_entry' })
@Unique({ properties: ['account'] })
export class QueueEntry {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @ManyToOne(() => Account, { deleteRule: 'cascade' })
  account!: Account

  @ManyToOne(() => Character, { deleteRule: 'cascade' })
  character!: Character

  @Enum({ items: () => CharacterCategory })
  category!: CharacterCategory

  /**
   * Frozen on entry (RF-003): the search band needs a reference that does not
   * move while it searches, and RF-077 averages this value per side.
   */
  @Property({ type: 'integer' })
  eloAtEntry!: number

  @Property()
  joinedAt: Date & Opt = new Date()

  /**
   * Null while searching (`buscando`). Set when the queue places the entry in
   * a lobby (#231): the row stays, so the account still holds its one entry,
   * the character stays locked (RF-031 covers the lobby too), and whoever
   * returns to the search keeps `joinedAt`.
   */
  @ManyToOne(() => Lobby, { nullable: true, deleteRule: 'set null' })
  lobby?: Lobby | null
}

/**
 * RF-031: a character in the queue takes no print, no category change and no
 * replacement until it leaves. Callers hold the account lock, the same one
 * joining takes, so the answer cannot change under them.
 */
export async function assertNotQueued(em: EntityManager, characterId: string): Promise<void> {
  if (await em.count(QueueEntry, { character: characterId })) {
    throw new ConflictException('character_in_queue')
  }
}
