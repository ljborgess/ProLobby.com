import { Entity, Enum, ManyToOne, Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from '../account/account.entity'
import { CharacterCategory } from '../character/archetype'
import { Character } from '../character/character.entity'
import { Lobby } from './lobby.entity'

export enum LobbySide {
  A = 'a',
  B = 'b',
}

/**
 * Dossier counterpart: `ParticipacaoLobby` in docs/requisitos/03-dados.md —
 * #231. One per human the queue placed; the invite confirmation and the
 * formation vote arrive with phase 3.
 */
@Entity({ tableName: 'lobby_participation' })
@Unique({ properties: ['lobby', 'account'] })
export class LobbyParticipation {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @ManyToOne(() => Lobby, { deleteRule: 'cascade' })
  lobby!: Lobby

  @ManyToOne(() => Account, { deleteRule: 'cascade' })
  account!: Account

  @ManyToOne(() => Character, { deleteRule: 'cascade' })
  character!: Character

  @Enum({ items: () => LobbySide })
  side!: LobbySide

  @Enum({ items: () => CharacterCategory })
  category!: CharacterCategory

  /** `confirmou_entrada`: accepted within the 30 s (#232). */
  @Property({ nullable: true })
  confirmedAt?: Date
}
