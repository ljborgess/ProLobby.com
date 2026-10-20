import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { isUniqueViolation } from '../../common/database/postgres-error'
import { encryptAtRest, readEvidenceEncryptionKey } from '../../common/security/evidence-encryption'
import { Account } from '../account/account.entity'
import { checkPrintImage, printsDir, sha256 } from '../character/print-submission.service'
import { LobbyParticipation, LobbySide } from '../lobby/lobby-participation.entity'
import { Lobby, LobbyState } from '../lobby/lobby.entity'
import { MatchReport } from '../lobby/match-report.entity'
import { ModerationCase } from '../moderation/moderation-case.entity'
import { ModerationCaseOrigin, ModerationCaseType } from '../moderation/moderation-case.enums'
import { ReputationEventReason } from '../ranking/ranking-event.enums'
import { ReputationService } from '../ranking/reputation.service'
import { PeerRatingService, type TeammateView } from './peer-rating.service'
import { QueueEntry } from './queue-entry.entity'

/** RF-045: no print before this, counted from `closed_at`. */
export const REPORT_FLOOR_MS = 5 * 60 * 1000
/** RF-043: no print at all this long after `closed_at` and the match expires, with penalty. */
export const ZERO_REPORT_MS = 60 * 60 * 1000
/** RF-043: the other side's window, counted from the first accepted report. */
export const CONFIRMATION_WINDOW_MS = 15 * 60 * 1000
/** RF-043: a one-sided result is open to contest this long, then it is final. */
export const CONTEST_WINDOW_MS = 48 * 60 * 60 * 1000
/** Same as the character prints (LGPD policy): the file goes, the hash stays. */
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000

export const reportableFrom = (lobby: Pick<Lobby, 'closedAt'>): Date | null =>
  lobby.closedAt ? new Date(lobby.closedAt.getTime() + REPORT_FLOOR_MS) : null

export const reportConfirmBy = (lobby: Pick<Lobby, 'firstReportAt'>): Date | null =>
  lobby.firstReportAt ? new Date(lobby.firstReportAt.getTime() + CONFIRMATION_WINDOW_MS) : null

export type ReportScore = { scoreA: number; scoreB: number }

export type MatchReportView = ReportScore & { id: string; side: LobbySide }

/** States a match ends up in once it has a result, or lacks one for good. */
const RESULT_STATES: readonly LobbyState[] = [
  LobbyState.NOT_CONFIRMED,
  LobbyState.FINISHED,
  LobbyState.IN_DISPUTE,
  LobbyState.EXPIRED_NO_REPORT,
]

/**
 * The account's latest match with a result (`GET /api/queue`): after it
 * settles the queue entry is gone, and this is where the screen finds the
 * lobby to contest.
 */
export type LastMatchView = {
  lobbyId: string
  state: LobbyState
  scoreA: number | null
  scoreB: number | null
  /** Set while this account can still contest (RF-012); null otherwise. */
  contestUntil: Date | null
  /** The side's other humans: rated once the match is `finished` (4.2). */
  teammates: TeammateView[]
  /** The other side's humans, to report (4.2). */
  opponents: TeammateView[]
}

/**
 * The result of a match, reported by any human of it — phase 4.1, first slice.
 *
 * A print of the final screen plus the score typed next to it. Until OCR
 * joins (#191), the typed score is what gets compared; the print is the
 * evidence moderation looks at. The first accepted report moves the lobby to
 * `awaiting_confirmation` and starts the other side's 15 min. The other side's
 * first report settles it: the same score finishes the match, a different one
 * opens a score dispute. Nobody from the other side in 15 min: `not_confirmed`,
 * final after 48 h without a contest. The print itself is checked like a character print: real
 * image type and size first, then the hash, so the same file never reports a
 * second match.
 */
@Injectable()
export class MatchReportService {
  private readonly logger = new Logger(MatchReportService.name)
  private readonly encryptionKey = readEvidenceEncryptionKey()

  constructor(
    private readonly em: EntityManager,
    private readonly reputationService: ReputationService,
    private readonly peerRatingService: PeerRatingService,
  ) {}

  async submit(
    accountId: string,
    score: ReportScore,
    file: Buffer,
    now: Date = new Date(),
  ): Promise<MatchReportView> {
    // Cheapest first: garbage never reaches the database or the disk.
    const rejection = checkPrintImage(file)
    if (rejection) {
      throw new BadRequestException(rejection)
    }
    const fileHash = sha256(file)
    // ponytail: a crash between this write and the commit leaves an encrypted
    // file no row points at, same as the character prints.
    const path = join(printsDir(), `match-${randomUUID()}.enc`)
    try {
      return await this.em.fork().transactional(async (em) => {
        const { lobby, mine } = await this.mine(em, accountId)
        if (!open(lobby, now)) {
          throw new ConflictException('report_closed')
        }
        const from = reportableFrom(lobby)!
        if (now < from) {
          // RF-045: refused without counting as anything, saying how long is left.
          throw new HttpException(
            {
              message: 'report_too_early',
              retryAfterSeconds: Math.ceil((from.getTime() - now.getTime()) / 1000),
            },
            HttpStatus.CONFLICT,
          )
        }
        const earlier = await em.find(MatchReport, { lobby }, { orderBy: { submittedAt: 'asc' } })
        if (earlier.some((r) => r.account?.id === accountId)) {
          throw new ConflictException('report_exists')
        }
        if (await em.count(MatchReport, { fileHash })) {
          throw new ConflictException('print_already_used')
        }

        await mkdir(printsDir(), { recursive: true })
        await writeFile(path, encryptAtRest(this.encryptionKey, file))
        const report = em.create(MatchReport, {
          lobby,
          account: em.getReference(Account, accountId),
          side: mine.side,
          ...score,
          fileHash,
          filePath: path,
          submittedAt: now,
        })
        if (lobby.state === LobbyState.IN_PROGRESS) {
          lobby.state = LobbyState.AWAITING_CONFIRMATION
          lobby.firstReportAt = now
        } else if (earlier[0]!.side !== mine.side) {
          // The other side answered. Same-side extras before it count too: any
          // mismatch is a divergence.
          if (earlier.every((r) => r.scoreA === score.scoreA && r.scoreB === score.scoreB)) {
            await settle(em, lobby, LobbyState.FINISHED, now, score)
            await this.cleanMatch(em, lobby)
          } else {
            em.create(ModerationCase, {
              type: ModerationCaseType.SCORE_DISPUTE,
              origin: ModerationCaseOrigin.SYSTEM,
              lobbyId: lobby.id,
            })
            lobby.state = LobbyState.IN_DISPUTE
          }
        }
        await em.flush()
        return toView(report)
      })
    } catch (error) {
      await rm(path, { force: true })
      // The same file sent at the same moment by someone else: the unique hash decided.
      if (isUniqueViolation(error)) throw new ConflictException('print_already_used')
      throw error
    }
  }

  /**
   * RF-042: the reporter fixes a typo in the score while the other side has
   * not reported. The print stays; afterwards the way is contesting.
   */
  async correct(
    accountId: string,
    score: ReportScore,
    now: Date = new Date(),
  ): Promise<MatchReportView> {
    return this.em.fork().transactional(async (em) => {
      const { lobby, mine } = await this.mine(em, accountId)
      const report = await em.findOne(MatchReport, { lobby, account: accountId })
      if (!report) {
        throw new NotFoundException('no_report')
      }
      const answered = await em.count(MatchReport, {
        lobby,
        side: mine.side === LobbySide.A ? LobbySide.B : LobbySide.A,
      })
      if (lobby.state !== LobbyState.AWAITING_CONFIRMATION || !open(lobby, now) || answered > 0) {
        throw new ConflictException('report_closed')
      }
      report.scoreA = score.scoreA
      report.scoreB = score.scoreB
      report.correctedAt = now
      await em.flush()
      return toView(report)
    })
  }

  /**
   * The clock's part, run by the queue job: 60 min without a single print
   * expire the match (−3 each, RF-071); 15 min with one side only become
   * `not_confirmed` and free the queue; 48 h of that become `finished`.
   * Returns how many lobbies it moved.
   */
  async expire(now: Date = new Date()): Promise<number> {
    return this.em.fork().transactional(async (em) => {
      // Only from in_progress: every invite arrived, so the match happened
      // and reporting was the group's duty (02-estados.md, state 12).
      const silent = await em.find(
        Lobby,
        {
          state: LobbyState.IN_PROGRESS,
          closedAt: { $lte: new Date(now.getTime() - ZERO_REPORT_MS) },
        },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      for (const lobby of silent) {
        for (const account of await lockHumans(em, lobby)) {
          await this.reputationService.zeroReportIn(em, account, lobby.id, now)
        }
        lobby.state = LobbyState.EXPIRED_NO_REPORT
        lobby.endedAt = now
        await em.flush()
        await em.nativeDelete(QueueEntry, { lobby })
      }
      const unconfirmed = await em.find(
        Lobby,
        {
          state: LobbyState.AWAITING_CONFIRMATION,
          firstReportAt: { $lte: new Date(now.getTime() - CONFIRMATION_WINDOW_MS) },
        },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      for (const lobby of unconfirmed) {
        // ponytail: two reports of the same side that disagree still take the
        // first one; a contest (RF-012) is the way to fix it.
        const first = await em.findOneOrFail(
          MatchReport,
          { lobby },
          { orderBy: { submittedAt: 'asc' } },
        )
        await settle(em, lobby, LobbyState.NOT_CONFIRMED, now, first)
      }
      const final = await em.find(
        Lobby,
        {
          state: LobbyState.NOT_CONFIRMED,
          unconfirmedAt: { $lte: new Date(now.getTime() - CONTEST_WINDOW_MS) },
        },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      for (const lobby of final) {
        lobby.state = LobbyState.FINISHED
        lobby.endedAt = now
        await this.cleanMatch(em, lobby)
      }
      await em.flush()
      return silent.length + unconfirmed.length + final.length
    })
  }

  /**
   * RF-012, RF-013: any human of the match contests a one-sided result within
   * its 48 h, once. The lobby goes to `in_dispute` with a score-dispute case,
   * and everyone in it is held again: out of the search, no new queue until
   * moderation decides.
   */
  async contest(accountId: string, lobbyId: string, now: Date = new Date()): Promise<void> {
    await this.em.fork().transactional(async (em) => {
      // The lobby row serializes contests and the 48 h job.
      const lobby = await em.findOne(
        Lobby,
        { id: lobbyId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      if (!lobby || !(await em.count(LobbyParticipation, { lobby, account: accountId }))) {
        throw new NotFoundException('no_lobby')
      }
      if (
        await em.count(ModerationCase, {
          type: ModerationCaseType.SCORE_DISPUTE,
          lobbyId,
          openedBy: accountId,
        })
      ) {
        throw new ConflictException('contest_exists')
      }
      if (
        lobby.state !== LobbyState.NOT_CONFIRMED ||
        now.getTime() >= lobby.unconfirmedAt!.getTime() + CONTEST_WINDOW_MS
      ) {
        throw new ConflictException('contest_closed')
      }
      em.create(ModerationCase, {
        type: ModerationCaseType.SCORE_DISPUTE,
        origin: ModerationCaseOrigin.USER,
        lobbyId,
        openedBy: em.getReference(Account, accountId),
      })
      lobby.state = LobbyState.IN_DISPUTE
      lobby.scoreA = undefined
      lobby.scoreB = undefined
      await em.flush()
      // Searching again since the 15 min: back out. Whoever was placed in a
      // new lobby stays there; seven other people count on that roster.
      const accounts = await em.find(LobbyParticipation, { lobby }, { fields: ['account'] })
      await em.nativeDelete(QueueEntry, {
        account: { $in: accounts.map((p) => p.account.id) },
        lobby: null,
      })
    })
  }

  async lastMatch(em: EntityManager, accountId: string): Promise<LastMatchView | null> {
    const mine = await em.findOne(
      LobbyParticipation,
      { account: accountId, lobby: { state: { $in: [...RESULT_STATES] } } },
      { orderBy: { lobby: { createdAt: 'desc' } }, populate: ['lobby'] },
    )
    if (!mine) return null
    const lobby = mine.lobby
    const open =
      lobby.state === LobbyState.NOT_CONFIRMED &&
      !(await em.count(ModerationCase, {
        type: ModerationCaseType.SCORE_DISPUTE,
        lobbyId: lobby.id,
        openedBy: accountId,
      }))
    return {
      lobbyId: lobby.id,
      state: lobby.state,
      scoreA: lobby.scoreA ?? null,
      scoreB: lobby.scoreB ?? null,
      contestUntil: open ? new Date(lobby.unconfirmedAt!.getTime() + CONTEST_WINDOW_MS) : null,
      ...(await this.peerRatingService.players(em, lobby, accountId)),
    }
  }

  /** What the lobby screen shows of this account's report (`GET /api/queue`). */
  async view(em: EntityManager, lobby: Lobby, accountId: string): Promise<MatchReportView | null> {
    const report = await em.findOne(MatchReport, { lobby, account: accountId })
    return report ? toView(report) : null
  }

  /** The 90-day retention of the result prints, run with the character ones. */
  async deleteExpiredFiles(now: Date = new Date()): Promise<number> {
    const em = this.em.fork()
    const expired = await em.find(MatchReport, {
      filePath: { $ne: null },
      submittedAt: { $lt: new Date(now.getTime() - RETENTION_MS) },
    })
    let deleted = 0
    for (const report of expired) {
      try {
        await rm(report.filePath!, { force: true })
      } catch (error) {
        this.logger.error(
          `failed to delete expired result print ${report.id}`,
          error instanceof Error ? error.stack : undefined,
        )
        continue
      }
      report.filePath = undefined
      deleted += 1
    }
    if (deleted > 0) await em.flush()
    return deleted
  }

  /**
   * A finished match is a clean one for every human of it: +1 reputation, up
   * to 70 (#208). Disconnects and upheld reports come with their own slices
   * and reverse it then.
   */
  private async cleanMatch(em: EntityManager, lobby: Lobby): Promise<void> {
    for (const account of await lockHumans(em, lobby)) {
      await this.reputationService.applyIn(em, account, ReputationEventReason.CLEAN_MATCH, lobby.id)
    }
  }

  private async mine(em: EntityManager, accountId: string) {
    // The latest lobby, not the queue entry: a settled match has none left,
    // and its reporters should hear "closed", not "no lobby".
    const mine = await em.findOne(
      LobbyParticipation,
      { account: accountId },
      { orderBy: { lobby: { createdAt: 'desc' } } },
    )
    if (!mine) {
      throw new NotFoundException('no_lobby')
    }
    // The lobby row serializes the reports of everyone in it.
    const lobby = await em.findOneOrFail(
      Lobby,
      { id: mine.lobby.id },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    )
    return { lobby, mine }
  }
}

/** Every human of the lobby, under the reputation writer's lock, in id order so two runs never deadlock. */
async function lockHumans(em: EntityManager, lobby: Lobby): Promise<Account[]> {
  const participations = await em.find(LobbyParticipation, { lobby })
  return em.find(
    Account,
    { id: { $in: participations.map((p) => p.account.id) } },
    { lockMode: LockMode.PESSIMISTIC_WRITE, orderBy: { id: 'asc' } },
  )
}

/** Reports are taken while the match runs and inside the other side's 15 min. */
function open(lobby: Lobby, now: Date): boolean {
  // Past a deadline the job has not reached yet: closed all the same.
  if (lobby.state === LobbyState.IN_PROGRESS) {
    return now.getTime() < lobby.closedAt!.getTime() + ZERO_REPORT_MS
  }
  return lobby.state === LobbyState.AWAITING_CONFIRMATION && now < reportConfirmBy(lobby)!
}

/**
 * The score is set and nobody holds the lobby any more: the queue entries go
 * (the account is out of the queue, the character unlocked). Elo is #209's.
 */
async function settle(
  em: EntityManager,
  lobby: Lobby,
  state: LobbyState.FINISHED | LobbyState.NOT_CONFIRMED,
  now: Date,
  score: ReportScore,
): Promise<void> {
  lobby.state = state
  lobby.scoreA = score.scoreA
  lobby.scoreB = score.scoreB
  if (state === LobbyState.FINISHED) lobby.endedAt = now
  else lobby.unconfirmedAt = now
  await em.flush()
  await em.nativeDelete(QueueEntry, { lobby })
}

function toView(report: MatchReport): MatchReportView {
  return { id: report.id, side: report.side, scoreA: report.scoreA, scoreB: report.scoreB }
}
