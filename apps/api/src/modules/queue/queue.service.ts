import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import { CURRENT_EDITION } from '../../common/domain/game-edition.enum'
import { isUniqueViolation } from '../../common/database/postgres-error'
import { Account } from '../account/account.entity'
import { CharacterCategory } from '../character/archetype'
import { ACTIVE_CHARACTER_STATES, Character, CharacterState } from '../character/character.entity'
import { DeclaredClub } from '../account/declared-club.entity'
import { CaptainOffer } from '../lobby/captain-offer.entity'
import { LobbyParticipation, LobbySide } from '../lobby/lobby-participation.entity'
import { type Lobby, LobbyState } from '../lobby/lobby.entity'
import { EloService } from '../ranking/elo.service'
import { confirmBy } from './lobby-confirmation.service'
import { FormationVoteService, type FormationView } from './formation-vote.service'
import { inviteBy } from './lobby-invite.service'
import {
  reportConfirmBy,
  MatchReportService,
  reportableFrom,
  type LastMatchView,
  type MatchReportView,
} from './match-report.service'
import { captainAnswerBy } from './captain-cascade.service'
import { blockedUntilFor, blockStateFor } from './queue-block'
import { type QueueStall, QueueStallState } from './queue-stall'
import { PeerRatingService, type TeammateView } from './peer-rating.service'
import { QueueEntry } from './queue-entry.entity'

/** RF-002, in the order the refusal lists them. */
export type MissingPrerequisite = 'email' | 'character' | 'discord' | 'discord_server'

/**
 * Everything missing at once, never one per attempt (decided 2026-09-09).
 * The character is the one picked, not any: an unverified one cannot play
 * even if a sibling is verified. Left the server is its own reason (RF-060).
 */
export function missingPrerequisites(
  account: Pick<Account, 'emailVerified' | 'discordIdHash' | 'discordPresent'>,
  character: Pick<Character, 'state'>,
): MissingPrerequisite[] {
  const missing: MissingPrerequisite[] = []
  if (!account.emailVerified) missing.push('email')
  if (character.state !== CharacterState.VERIFIED) missing.push('character')
  if (account.discordIdHash == null) missing.push('discord')
  else if (!account.discordPresent) missing.push('discord_server')
  return missing
}

export interface QueueEntryView {
  characterId: string
  category: CharacterCategory
  joinedAt: Date
  /**
   * Searching again because a lobby of this entry was cancelled (#247, #248):
   * why, for the screen to say it (#252). A lobby undone in the 30 s leaves no
   * row, so that case never shows here.
   */
  cancelledLobby: {
    state: LobbyState.CANCELLED_NO_FAULT | LobbyState.CANCELLED_BY_CAPTAIN
    endedAt: Date
  } | null
  /**
   * While searching: what keeps the queue from closing for this category, as
   * of the last run (RF-007, #234). Null once placed, or when nothing does.
   */
  stall: QueueStall | null
  /** Null while searching; once placed, what the 30 s screen needs (#232). */
  lobby: {
    state: LobbyState
    confirmBy: Date
    /** This account's side: `scoreA` is side A's goals (4.1). */
    side: LobbySide
    confirmed: boolean
    /**
     * In the 30 s, before answering: how long refusing would block, in
     * minutes (RF-009, #234). Null once answered or past the 30 s step.
     */
    refusalBlockMinutes: number | null
    /** The captain role offered to this account right now, if it is (#247). */
    captainOffer: { answerBy: Date; clubName: string } | null
    /** This account confirmed as its side's captain. */
    isCaptain: boolean
    /** End of the 5 min invite window, once both captains confirmed (#248). */
    inviteBy: Date | null
    /** The club of this side's captain: where the invite comes from (#248). */
    inviteClubName: string | null
    inviteReceived: boolean
    /** Only a captain can: the club filled up after its last update (#248). */
    clubFullDeclared: boolean
    /** The side's formation vote (#249); null outside a lobby's roster. */
    formation: FormationView | null
    /** The result print is accepted from here (RF-045, 4.1); null before the lobby closed. */
    reportableFrom: Date | null
    /** This account's own result report, if sent. */
    myReport: MatchReportView | null
    /** After the first report: the other side reports until here (RF-043). */
    reportConfirmBy: Date | null
    /** While the match runs: who played, to name an absence in the report (4.1). */
    players: { teammates: TeammateView[]; opponents: TeammateView[] } | null
  } | null
}

/** RF-008: what the screen shows of each category, never the count. */
export type MovementBand = 'low' | 'busy' | 'full'

/** #233: under 5 searching is "pouca gente", 5 to 15 "movimentada", over 15 "cheia". */
export function movementBand(searching: number): MovementBand {
  if (searching < 5) return 'low'
  return searching <= 15 ? 'busy' : 'full'
}

/** Joining and leaving the queue — RF-001, RF-002, RF-003, RF-009, #228. */
@Injectable()
export class QueueService {
  constructor(
    private readonly em: EntityManager,
    private readonly eloService: EloService,
    private readonly formationVoteService: FormationVoteService,
    private readonly matchReportService: MatchReportService,
    private readonly peerRatingService: PeerRatingService,
    private readonly stall: QueueStallState,
  ) {}

  async current(
    accountId: string,
    now: Date = new Date(),
  ): Promise<{
    entry: QueueEntryView | null
    blockedUntil: Date | null
    lastMatch: LastMatchView | null
  }> {
    const em = this.em.fork()
    const entry = await em.findOne(QueueEntry, { account: accountId }, { populate: ['lobby'] })
    const mine =
      entry?.lobby &&
      (await em.findOne(LobbyParticipation, { lobby: entry.lobby, account: accountId }))
    const offer =
      entry?.lobby &&
      (await em.findOne(CaptainOffer, { lobby: entry.lobby, account: accountId, outcome: null }))
    const club = offer ? await em.findOne(DeclaredClub, { account: accountId }) : null
    const myReport = entry?.lobby
      ? await this.matchReportService.view(em, entry.lobby, accountId)
      : null
    // The entry keeps its joinedAt through a cancellation, so a lobby that
    // ended after it is one this search came back from.
    const block = await blockStateFor(em, accountId, now)
    const cancelled =
      entry && !entry.lobby
        ? await em.findOne(
            LobbyParticipation,
            {
              account: accountId,
              lobby: {
                state: { $in: [LobbyState.CANCELLED_NO_FAULT, LobbyState.CANCELLED_BY_CAPTAIN] },
                endedAt: { $gte: entry.joinedAt },
              },
            },
            { orderBy: { lobby: { endedAt: 'desc' } }, populate: ['lobby'] },
          )
        : null
    return {
      entry: entry
        ? toView(entry, cancelled?.lobby, this.stall.for(entry.category), {
            side: mine?.side ?? LobbySide.A,
            confirmed: mine ? !!mine.confirmedAt : false,
            refusalBlockMinutes:
              entry.lobby?.state === LobbyState.WAITING_PLAYERS && mine && !mine.confirmedAt
                ? Math.round(block.refusalBlockMs / 60_000)
                : null,
            captainOffer: offer
              ? { answerBy: captainAnswerBy(offer), clubName: club?.clubName ?? '' }
              : null,
            isCaptain:
              entry.lobby?.captainA?.id === accountId || entry.lobby?.captainB?.id === accountId,
            inviteClubName:
              (mine && (mine.side === LobbySide.A ? entry.lobby?.clubA : entry.lobby?.clubB)) ??
              null,
            inviteReceived: !!mine?.inviteReceivedAt,
            clubFullDeclared: !!mine?.clubFullDeclaredAt,
            formation:
              mine && entry.lobby
                ? await this.formationVoteService.view(em, entry.lobby, mine)
                : null,
            reportableFrom: entry.lobby ? reportableFrom(entry.lobby) : null,
            myReport,
            reportConfirmBy: entry.lobby ? reportConfirmBy(entry.lobby) : null,
            // Only for the report form: once this account reported, nobody to name.
            players:
              entry.lobby &&
              !myReport &&
              (entry.lobby.state === LobbyState.IN_PROGRESS ||
                entry.lobby.state === LobbyState.AWAITING_CONFIRMATION)
                ? await this.peerRatingService.players(em, entry.lobby, accountId)
                : null,
          })
        : null,
      blockedUntil: block.blockedUntil,
      lastMatch: await this.matchReportService.lastMatch(em, accountId),
    }
  }

  /** The band of each category among those still searching (RF-008). */
  async movement(): Promise<Record<CharacterCategory, MovementBand>> {
    const rows = await this.em
      .fork()
      .getConnection()
      .execute<{ category: CharacterCategory; searching: string }[]>(
        `select category, count(*) as searching from queue_entry where lobby_id is null group by category`,
      )
    const counts = new Map(rows.map((row) => [row.category, Number(row.searching)]))
    return Object.fromEntries(
      Object.values(CharacterCategory).map((category) => [
        category,
        movementBand(counts.get(category) ?? 0),
      ]),
    ) as Record<CharacterCategory, MovementBand>
  }

  async join(accountId: string, characterId: string): Promise<QueueEntryView> {
    try {
      return await this.em.fork().transactional(async (em) => {
        // The lock every character write takes too, so RF-031 holds: no
        // print or replacement lands between this check and the insert.
        const account = await em.findOneOrFail(
          Account,
          { id: accountId },
          { lockMode: LockMode.PESSIMISTIC_WRITE },
        )
        if (await em.count(QueueEntry, { account: accountId })) {
          throw new ConflictException('already_in_queue')
        }
        // RF-013: a match in dispute holds everyone in it until moderation decides.
        if (
          await em.count(LobbyParticipation, {
            account: accountId,
            lobby: { state: LobbyState.IN_DISPUTE },
          })
        ) {
          throw new ConflictException('match_in_dispute')
        }
        // RF-009: the message carries the time left.
        const now = new Date()
        const blocked = await blockedUntilFor(em, accountId, now)
        if (blocked) {
          throw new ForbiddenException({
            message: 'queue_blocked',
            blockedUntil: blocked,
            retryAfterSeconds: Math.ceil((blocked.getTime() - now.getTime()) / 1000),
          })
        }
        const character = await em.findOne(Character, {
          id: characterId,
          account: accountId,
          edition: CURRENT_EDITION,
          state: { $in: [...ACTIVE_CHARACTER_STATES] },
        })
        if (!character) {
          throw new NotFoundException('character_not_found')
        }
        const missing = missingPrerequisites(account, character)
        if (missing.length > 0) {
          throw new ForbiddenException({ message: 'queue_prerequisites_missing', missing })
        }

        const entry = em.create(QueueEntry, {
          account,
          character,
          category: character.category,
          eloAtEntry: await this.eloService.ofIn(
            em,
            accountId,
            character.category,
            CURRENT_EDITION,
          ),
        })
        await em.flush()
        return toView(entry)
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('already_in_queue')
      }
      throw error
    }
  }

  /**
   * Frees the account and the character at once; leaving twice is fine. Once
   * placed in a lobby, the way out is refusing it (#232), not leaving: a
   * deleted entry would leave a hole in a roster already formed.
   */
  async leave(accountId: string): Promise<void> {
    const em = this.em.fork()
    const deleted = await em.nativeDelete(QueueEntry, { account: accountId, lobby: null })
    if (deleted === 0 && (await em.count(QueueEntry, { account: accountId }))) {
      throw new ConflictException('queue_entry_in_lobby')
    }
  }
}

type LobbyExtra = Omit<NonNullable<QueueEntryView['lobby']>, 'state' | 'confirmBy' | 'inviteBy'>

function toView(
  entry: QueueEntry,
  cancelled?: Lobby,
  stall: QueueStall | null = null,
  extra?: LobbyExtra,
): QueueEntryView {
  return {
    characterId: entry.character.id,
    category: entry.category,
    joinedAt: entry.joinedAt,
    cancelledLobby: cancelled
      ? {
          state: cancelled.state as NonNullable<QueueEntryView['cancelledLobby']>['state'],
          endedAt: cancelled.endedAt!,
        }
      : null,
    stall: entry.lobby ? null : stall,
    lobby:
      entry.lobby && extra
        ? {
            state: entry.lobby.state,
            confirmBy: confirmBy(entry.lobby),
            inviteBy: inviteBy(entry.lobby),
            ...extra,
          }
        : null,
  }
}
