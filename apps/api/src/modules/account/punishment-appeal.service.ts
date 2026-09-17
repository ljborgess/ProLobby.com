import { EntityManager } from '@mikro-orm/postgresql'
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'

import { isUniqueViolation } from '../../common/database/postgres-error'
import { ModerationCase } from '../moderation/moderation-case.entity'
import {
  ModerationCaseOrigin,
  ModerationCaseState,
  ModerationCaseType,
} from '../moderation/moderation-case.enums'
import { Account } from './account.entity'

/**
 * Files an appeal against the account's own punishment — RF-081, RF-037.
 *
 * Scoped to BANNED only for now: it is the one state `PunishmentStatusService`
 * already resolves to a specific `ModerationCase` (a suspension is usually
 * automatic and opens no case at all — see that service). Extending this to
 * SUSPENDED needs a case to point at first, which is a different problem.
 */
@Injectable()
export class PunishmentAppealService {
  constructor(private readonly em: EntityManager) {}

  async open(account: Account, message: string): Promise<ModerationCase> {
    const em = this.em.fork()

    // The most recent resolved case is what PunishmentStatusService already
    // shows this account as "the reason" — same heuristic, same known limit
    // (documented there): a case unrelated to the ban, resolved later, could
    // be picked instead. Appealing the wrong case is still visible to a
    // moderator reading it, so this is a display risk, not a security one.
    //
    // Appeals themselves are excluded, and that part is not cosmetic: once a
    // moderator resolves an appeal, it becomes the account's most recently
    // resolved case. Without this filter the next appeal would target the
    // previous appeal — a different `appealsCase`, so the unique index below
    // allows it — and RF-037 ("one appeal per punishment") would be defeated
    // by an endless chain.
    const targetCase = await em.findOne(
      ModerationCase,
      {
        targetAccount: account.id,
        state: ModerationCaseState.RESOLVED,
        type: { $ne: ModerationCaseType.PUNISHMENT_APPEAL },
      },
      { orderBy: { resolvedAt: 'DESC' } },
    )

    if (!targetCase) {
      // Banned with nothing on record to appeal against — the ban mechanism
      // itself doesn't exist yet (see PunishmentStatusService), so this is
      // reachable today by manually flipping state in a test, not by a real
      // moderator decision.
      throw new BadRequestException('no_punishment_to_appeal')
    }

    const appeal = em.create(ModerationCase, {
      type: ModerationCaseType.PUNISHMENT_APPEAL,
      origin: ModerationCaseOrigin.USER,
      targetAccount: account,
      openedBy: account,
      appealsCase: targetCase,
      appealMessage: message,
    })

    try {
      em.persist(appeal)
      await em.flush()
    } catch (error) {
      // The partial unique index (migration 20260917100000) is what decides
      // this, not a prior read: two simultaneous requests can both reach
      // here, and only one insert wins (RF-037 — one appeal per punishment).
      if (isUniqueViolation(error)) {
        throw new ConflictException('appeal_already_filed')
      }
      throw error
    }

    return appeal
  }
}
