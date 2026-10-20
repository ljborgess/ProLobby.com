import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { ModerationCase } from '../moderation/moderation-case.entity'
import { ModerationCaseState, ModerationCaseType } from '../moderation/moderation-case.enums'
import { ReputationEvent } from '../ranking/reputation-event.entity'
import { Account } from './account.entity'
import { AccountState } from './account.enums'

export interface PunishmentStatus {
  state: AccountState
  /**
   * `null` when the account is not punished, and also when it is punished but
   * nothing on record explains why — a state flipped by hand carries no row.
   */
  reason: string | null
  /** Only meaningful for SUSPENDED; `undefined` for every other state. */
  endsAt?: Date | null
  /** Only meaningful for BANNED — the case a future appeal endpoint refers to. */
  caseId?: string
}

/**
 * Surfaces a punishment to the account it happened to — RF-074, RF-081, gap
 * found in the review of #103.
 *
 * The guard (`@AllowStates`) already decides who reaches this; the service
 * only decides *what to say* to an account it let through.
 */
@Injectable()
export class PunishmentStatusService {
  constructor(private readonly em: EntityManager) {}

  async statusFor(account: Account): Promise<PunishmentStatus> {
    if (account.state === AccountState.SUSPENDED) {
      return this.suspendedStatus(account)
    }

    if (account.state === AccountState.BANNED) {
      return this.bannedStatus(account)
    }

    return { state: account.state, reason: null }
  }

  /**
   * Reason comes from the reputation log: what pushed the account across 40
   * (a zero-report, a disconnect, a moderator's adjustment) says more than the
   * suspension case, whose text is the same for everyone.
   */
  private async suspendedStatus(account: Account): Promise<PunishmentStatus> {
    const event = await this.em.findOne(
      ReputationEvent,
      { account: account.id, revertedAt: null },
      { orderBy: { createdAt: 'DESC' } },
    )

    return {
      state: account.state,
      reason: event?.reason ?? null,
      endsAt: account.suspensionEndsAt,
    }
  }

  /**
   * Reason comes from the moderation case, not the reputation log: a ban is a
   * moderator's decision, and `ModerationCase.decision` exists specifically
   * to be "read by the person involved" — see the field's own doc comment.
   * `ReputationEvent` has no free-text field to explain a decision like this.
   */
  private async bannedStatus(account: Account): Promise<PunishmentStatus> {
    // Appeals are excluded on purpose: a resolved appeal is the most recent
    // resolved case on the account, and showing its decision would replace
    // "why you were banned" with "why your appeal was turned down".
    const moderationCase = await this.em.findOne(
      ModerationCase,
      {
        targetAccount: account.id,
        state: ModerationCaseState.RESOLVED,
        type: { $ne: ModerationCaseType.PUNISHMENT_APPEAL },
      },
      { orderBy: { resolvedAt: 'DESC' } },
    )

    return {
      state: account.state,
      reason: moderationCase?.decision ?? null,
      caseId: moderationCase?.id,
    }
  }
}
