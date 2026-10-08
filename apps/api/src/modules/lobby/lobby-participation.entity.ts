import { Entity, Enum, ManyToOne, Opt, PrimaryKey, Unique } from '@mikro-orm/core'
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
 * #231. One per human the queue placed; the confirmations and the formation
 * vote arrive with #232 and phase 3.
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
}
