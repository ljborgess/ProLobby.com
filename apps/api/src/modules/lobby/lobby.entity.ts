import { Entity, Enum, ManyToOne, Opt, PrimaryKey, Property } from '@mikro-orm/core'
import { randomUUID } from 'node:crypto'

import { Account } from '../account/account.entity'

/**
 * docs/requisitos/02-estados.md. Only the states some code reaches today;
 * each phase adds its own (phase 3 the invite and the rest, 4.x the result).
 */
export enum LobbyState {
  WAITING_PLAYERS = 'waiting_players',
  WAITING_CAPTAIN = 'waiting_captain',
  /** Both captains confirmed (#247): the invite window runs (#248). */
  WAITING_INVITE = 'waiting_invite',
  /** Every human got the invite (#248): the match is on. */
  IN_PROGRESS = 'in_progress',
  /** The first result print arrived (4.1): the other side has 15 min to send theirs. */
  AWAITING_CONFIRMATION = 'awaiting_confirmation',
  /** 15 min with one side only (RF-043): the queue is free, contesting is open for 48 h. */
  NOT_CONFIRMED = 'not_confirmed',
  /** Terminal: the score is settled, from both sides or after the 48 h. */
  FINISHED = 'finished',
  /** The sides diverged: a score-dispute case decides, the queue stays held. */
  IN_DISPUTE = 'in_dispute',
  /** Terminal: 60 min of the match and not one print — −3 each (RF-071). */
  EXPIRED_NO_REPORT = 'expired_no_report',
  /** Terminal, no penalty for anyone: the match never existed. */
  CANCELLED_NO_FAULT = 'cancelled_no_fault',
  /** Terminal: someone never got the invite and the captain gave no reason (#248). */
  CANCELLED_BY_CAPTAIN = 'cancelled_by_captain',
}

/**
 * States after which the lobby holds nothing: no club, no queue. `not_confirmed`
 * is not terminal (a contest reopens it) but frees the queue all the same.
 */
export const TERMINAL_LOBBY_STATES: readonly LobbyState[] = [
  LobbyState.NOT_CONFIRMED,
  LobbyState.FINISHED,
  LobbyState.EXPIRED_NO_REPORT,
  LobbyState.CANCELLED_NO_FAULT,
  LobbyState.CANCELLED_BY_CAPTAIN,
]

/**
 * Dossier counterpart: `Lobby` in docs/requisitos/03-dados.md — #231.
 *
 * Born when the queue closes a roster. The captains and their clubs arrive
 * with the cascade (#247); channels and result columns with the phases that
 * fill them.
 */
@Entity({ tableName: 'lobby' })
export class Lobby {
  @PrimaryKey({ type: 'uuid' })
  id: string & Opt = randomUUID()

  @Enum({ items: () => LobbyState })
  state: LobbyState & Opt = LobbyState.WAITING_PLAYERS

  @Property()
  createdAt: Date & Opt = new Date()

  /** When everyone accepted and the captain cascade began: its 5 min count from here (RF-080). */
  @Property({ nullable: true })
  captainWaitStartedAt?: Date

  /**
   * `fechado_em`: both captains confirmed. The 5 min of the invite (#248) and
   * the 60 min of the zero-report (4.1) count from here, not from `createdAt`.
   */
  @Property({ nullable: true })
  closedAt?: Date

  /** Entered a terminal state; base of the orphan-channel sweep (RF-054). */
  @Property({ nullable: true })
  endedAt?: Date

  @ManyToOne(() => Account, { nullable: true, deleteRule: 'set null' })
  captainA?: Account | null

  @ManyToOne(() => Account, { nullable: true, deleteRule: 'set null' })
  captainB?: Account | null

  /**
   * The club name each captain declared when confirming — captured then, not
   * read later: it is the pair the result OCR validates (4.1), and the
   * declaration can change after the match.
   */
  @Property({ length: 20, nullable: true })
  clubA?: string

  @Property({ length: 20, nullable: true })
  clubB?: string

  /** `canal_texto_id`, `canal_voz_a_id`, `canal_voz_b_id`: told by the bot (#250). */
  @Property({ length: 20, nullable: true })
  textChannelId?: string

  // Named by hand: the naming strategy would glue the side letter ("voice_achannel_id").
  @Property({ length: 20, nullable: true, fieldName: 'voice_a_channel_id' })
  voiceAChannelId?: string

  @Property({ length: 20, nullable: true, fieldName: 'voice_b_channel_id' })
  voiceBChannelId?: string

  /** The bot created the channels: the 60 s formation vote counts from here (RF-034, #249). */
  @Property({ nullable: true })
  formationVoteStartedAt?: Date

  /** The 60 s were counted; a side still without a formation waits on its captain. */
  @Property({ nullable: true })
  formationVoteClosedAt?: Date

  @Property({ length: 12, nullable: true })
  formationA?: string

  @Property({ length: 12, nullable: true })
  formationB?: string

  /** The first accepted result print: the 15 min of the other side count from here (4.1). */
  @Property({ nullable: true })
  firstReportAt?: Date

  /** `nao_confirmado_em`: the 48 h of contesting count from here (RF-043). */
  @Property({ nullable: true })
  unconfirmedAt?: Date

  /** `placar_a` / `placar_b`: the score that counts, empty while disputed. */
  @Property({ type: 'smallint', nullable: true })
  scoreA?: number

  @Property({ type: 'smallint', nullable: true })
  scoreB?: number
}
