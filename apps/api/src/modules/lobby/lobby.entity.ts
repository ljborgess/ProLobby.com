import { Entity, Enum, Opt, PrimaryKey, Property } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

/**
 * docs/requisitos/02-estados.md. Only the states some code reaches today;
 * each phase adds its own (#232 the captain wait, phase 3 the rest).
 */
export enum LobbyState {
  WAITING_PLAYERS = 'waiting_players',
  WAITING_CAPTAIN = 'waiting_captain',
}

/**
 * Dossier counterpart: `Lobby` in docs/requisitos/03-dados.md — #231.
 *
 * Born when the queue closes a roster. The captain, clubs, channels and
 * result columns arrive with the phases that fill them.
 */
@Entity({ tableName: 'lobby' })
export class Lobby {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @Enum({ items: () => LobbyState })
  state: LobbyState & Opt = LobbyState.WAITING_PLAYERS

  @Property()
  createdAt: Date & Opt = new Date()
}
