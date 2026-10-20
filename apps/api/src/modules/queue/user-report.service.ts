import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'

import { Account } from '../account/account.entity'
import { LobbyParticipation } from '../lobby/lobby-participation.entity'
import { ModerationCase } from '../moderation/moderation-case.entity'
import {
  ModerationCaseOrigin,
  ModerationCaseState,
  ModerationCaseType,
  UserReportReason,
} from '../moderation/moderation-case.enums'

/** RF-068: open reports per account at a time. */
export const OPEN_REPORTS_CAP = 3
/** RF-069: dismissed reports in a rolling 30 days that make the reporter a case. */
export const BASELESS_REPORTS_THRESHOLD = 3
export const BASELESS_REPORTS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

/**
 * A report against someone of a match the reporter played — phase 4.2,
 * docs/produto/04-governanca/01-moderacao.md. Only people met in a match:
 * the profile rules give no other way to find someone (no free search).
 *
 * The reported person never learns who it was (RF-036): nothing here is
 * returned to them, and the case keeps the author for moderation only.
 */
@Injectable()
export class UserReportService {
  constructor(private readonly em: EntityManager) {}

  async open(
    accountId: string,
    lobbyId: string,
    participationId: string,
    reason: UserReportReason,
    message: string,
  ): Promise<{ caseId: string }> {
    return this.em.fork().transactional(async (em) => {
      // The reporter's lock: two reports at once cannot both pass the cap.
      const reporter = await em.findOneOrFail(
        Account,
        { id: accountId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      const [mine, theirs] = await Promise.all([
        em.count(LobbyParticipation, { lobby: lobbyId, account: accountId }),
        em.findOne(LobbyParticipation, { id: participationId, lobby: lobbyId }),
      ])
      if (!mine) {
        throw new NotFoundException('no_lobby')
      }
      if (!theirs || theirs.account.id === accountId) {
        throw new NotFoundException('not_in_match')
      }
      const open = await em.count(ModerationCase, {
        type: ModerationCaseType.USER_REPORT,
        openedBy: reporter,
        state: ModerationCaseState.OPEN,
      })
      if (open >= OPEN_REPORTS_CAP) {
        throw new ConflictException('too_many_open_reports')
      }
      const report = em.create(ModerationCase, {
        type: ModerationCaseType.USER_REPORT,
        origin: ModerationCaseOrigin.USER,
        lobbyId,
        targetAccount: theirs.account,
        openedBy: reporter,
        reportReason: reason,
        reportMessage: message,
      })
      await em.flush()
      return { caseId: report.id }
    })
  }

  /**
   * RF-069, for the moderation panel (phase 5) to call when it dismisses a
   * report as baseless: the third in 30 days opens a conduct case against
   * whoever filed them. Only dismissals after the last such case count, so
   * one run of reports never opens two. Inside the panel's transaction.
   */
  async afterDismissal(
    em: EntityManager,
    report: ModerationCase,
    now: Date = new Date(),
  ): Promise<void> {
    const reporter = report.openedBy
    if (report.type !== ModerationCaseType.USER_REPORT || !reporter) return
    const last = await em.findOne(
      ModerationCase,
      { type: ModerationCaseType.BASELESS_REPORTS, targetAccount: reporter },
      { orderBy: { openedAt: 'desc' } },
    )
    const since = Math.max(
      now.getTime() - BASELESS_REPORTS_WINDOW_MS,
      last?.openedAt.getTime() ?? 0,
    )
    const dismissed = await em.count(ModerationCase, {
      type: ModerationCaseType.USER_REPORT,
      openedBy: reporter,
      state: ModerationCaseState.DISMISSED,
      resolvedAt: { $gt: new Date(since), $lte: now },
    })
    if (dismissed < BASELESS_REPORTS_THRESHOLD) return
    em.create(ModerationCase, {
      type: ModerationCaseType.BASELESS_REPORTS,
      origin: ModerationCaseOrigin.SYSTEM,
      targetAccount: reporter,
      openedAt: now,
    })
  }
}
