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
import { QueueEntry } from './queue-entry.entity'

/** RF-045: no print before this, counted from `closed_at`. */
export const REPORT_FLOOR_MS = 5 * 60 * 1000
/** Same as the character prints (LGPD policy): the file goes, the hash stays. */
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000

export const reportableFrom = (lobby: Pick<Lobby, 'closedAt'>): Date | null =>
  lobby.closedAt ? new Date(lobby.closedAt.getTime() + REPORT_FLOOR_MS) : null

export type ReportScore = { scoreA: number; scoreB: number }

export type MatchReportView = ReportScore & { id: string; side: LobbySide }

/**
 * The result of a match, reported by any human of it — phase 4.1, first slice.
 *
 * A print of the final screen plus the score typed next to it. Until OCR
 * joins (#191), the typed score is what gets compared; the print is the
 * evidence moderation looks at. The first accepted report moves the lobby to
 * `awaiting_confirmation` and starts the other side's 15 min (counted by the
 * next slice). The print itself is checked like a character print: real
 * image type and size first, then the hash, so the same file never reports a
 * second match.
 */
@Injectable()
export class MatchReportService {
  private readonly logger = new Logger(MatchReportService.name)
  private readonly encryptionKey = readEvidenceEncryptionKey()

  constructor(private readonly em: EntityManager) {}

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
        if (
          lobby.state !== LobbyState.IN_PROGRESS &&
          lobby.state !== LobbyState.AWAITING_CONFIRMATION
        ) {
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
        if (await em.count(MatchReport, { lobby, account: accountId })) {
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
      if (lobby.state !== LobbyState.AWAITING_CONFIRMATION || answered > 0) {
        throw new ConflictException('report_closed')
      }
      report.scoreA = score.scoreA
      report.scoreB = score.scoreB
      report.correctedAt = now
      await em.flush()
      return toView(report)
    })
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

  private async mine(em: EntityManager, accountId: string) {
    const entry = await em.findOne(QueueEntry, { account: accountId, lobby: { $ne: null } })
    if (!entry?.lobby) {
      throw new NotFoundException('no_lobby')
    }
    // The lobby row serializes the reports of everyone in it.
    const lobby = await em.findOneOrFail(
      Lobby,
      { id: entry.lobby.id },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    )
    const mine = await em.findOneOrFail(LobbyParticipation, { lobby, account: accountId })
    return { lobby, mine }
  }
}

function toView(report: MatchReport): MatchReportView {
  return { id: report.id, side: report.side, scoreA: report.scoreA, scoreB: report.scoreB }
}
