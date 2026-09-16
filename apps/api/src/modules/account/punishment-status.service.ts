import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { ModerationCase } from '../moderation/moderation-case.entity'
import { ModerationCaseState } from '../moderation/moderation-case.enums'
import { ReputationEvent } from '../ranking/reputation-event.entity'
import { Account } from './account.entity'
import { AccountState } from './account.enums'

export interface PunishmentStatus {
  state: AccountState
  /**
   * `null` when the account is not punished, and also when it is punished but
   * nothing on record explains why yet — the mechanisms that set SUSPENDED or
   * BANNED are not built (this slice only displays), so a manually-flipped
   * account in tests or in early production can carry no matching row.
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
   * Reason comes from the reputation log, not the moderation queue: a
   * suspension is usually automatic (RF-071's zero-report escalation crossing
   * the threshold) and opens no case at all. `ReputationEvent.reason` is the
   * one thing every suspension path is guaranteed to have written, including
   * a moderator's manual adjustment (`MODERATION_ADJUSTMENT`).
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
    const moderationCase = await this.em.findOne(
      ModerationCase,
      { targetAccount: account.id, state: ModerationCaseState.RESOLVED },
      { orderBy: { resolvedAt: 'DESC' } },
    )

    return {
      state: account.state,
      reason: moderationCase?.decision ?? null,
      caseId: moderationCase?.id,
    }
  }
}
