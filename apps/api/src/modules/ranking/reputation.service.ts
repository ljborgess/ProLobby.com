import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { Account } from '../account/account.entity'
import { AccountState } from '../account/account.enums'
import { punishIn } from './punishment'
import { ReputationEventReason } from './ranking-event.enums'
import { ReputationEvent } from './reputation-event.entity'

/** docs/produto/parametros.md, "Reputação". */
export const REPUTATION_START = 70
export const CLEAN_MATCH_CAP = 70
export const SUSPENSION_RESTORE = 45
const DISCONNECT_DELTA = -8
const ZERO_REPORT_BASE = -3
/** RF-071: the rolling window that counts repeat zero-reports. */
export const ZERO_REPORT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

/**
 * What the account's reputation means for the queue and the punishment
 * ladder: under 55 the queue is slower, under 40 a suspension, under 25 a
 * ban (docs/produto/02-jogador/02-ranking.md). Derived from the number, so it
 * can never disagree with it; applying the suspension or ban is phase 4.2.
 */
export type ReputationBand = 'good' | 'slow_queue' | 'suspension' | 'ban'

export function reputationBand(reputation: number): ReputationBand {
  if (reputation < 25) {
    return 'ban'
  }
  if (reputation < 40) {
    return 'suspension'
  }
  if (reputation < 55) {
    return 'slow_queue'
  }
  return 'good'
}

/** The reasons this service applies on its own; the rest arrive with phase 4.2. */
export type AutomaticReputationReason =
  | ReputationEventReason.CLEAN_MATCH
  | ReputationEventReason.PEER_THUMBS_UP
  | ReputationEventReason.DISCONNECT
  | ReputationEventReason.SUSPENSION_SERVED

const AUTOMATIC_REASONS: ReadonlySet<ReputationEventReason> = new Set([
  ReputationEventReason.CLEAN_MATCH,
  ReputationEventReason.PEER_THUMBS_UP,
  ReputationEventReason.DISCONNECT,
  ReputationEventReason.SUSPENSION_SERVED,
])

/**
 * The delta each reason moves, from the current value. The caps live here so
 * every event stores the change that really happened, and the column always
 * equals 70 plus the sum of the events that were not reverted.
 */
export function reputationDelta(reason: AutomaticReputationReason, current: number): number {
  switch (reason) {
    case ReputationEventReason.CLEAN_MATCH:
      // Playing only recovers up to 70; above it, only a thumbs-up counts.
      return current < CLEAN_MATCH_CAP ? 1 : 0
    case ReputationEventReason.PEER_THUMBS_UP:
      // The only way above 70, up to the top of the scale.
      return current < 100 ? 1 : 0
    case ReputationEventReason.DISCONNECT:
      return Math.max(DISCONNECT_DELTA, 0 - current)
    case ReputationEventReason.SUSPENSION_SERVED:
      // RF-074: back to 45 wherever it was, not +N.
      return SUSPENSION_RESTORE - current
  }
}

/**
 * RF-071, per account: −3 the 1st and 2nd time in 30 days, then 3 more each
 * time (3rd −6, 4th −9, 5th −12). Never below zero, like every other loss.
 */
export function zeroReportDelta(earlierInWindow: number, current: number): number {
  const occurrence = earlierInWindow + 1
  return Math.max(ZERO_REPORT_BASE * Math.max(1, occurrence - 1), 0 - current)
}

export type ReputationChange = {
  reputation: number
  band: ReputationBand
  /**
   * Set when the change left one band for another, with the direction: phase
   * 4.2 suspends on the way down, never on someone climbing back out.
   */
  crossed: { from: ReputationBand; to: ReputationBand } | null
}

/**
 * The only writer of `Account.reputation` — #208. Every change is a
 * `ReputationEvent` in the same transaction, under the account lock, so two
 * results for one account at once cannot lose an update.
 *
 * A change of zero (a clean match at 70) is still an event with delta 0:
 * whether it moved the number depends on what came before, and a rollback
 * (#210) replays the log to recompute it. A crossing is not stored apart:
 * the ordered log already says where each event started and ended.
 */
@Injectable()
export class ReputationService {
  constructor(private readonly em: EntityManager) {}

  /** Standalone: its own transaction, taking the account lock. */
  apply(
    accountId: string,
    reason: AutomaticReputationReason,
    lobbyId?: string,
  ): Promise<ReputationChange> {
    return this.em.fork().transactional(async (em) => {
      const account = await em.findOneOrFail(
        Account,
        { id: accountId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      const change = await this.applyIn(em, account, reason, lobbyId)
      await em.flush()
      return change
    })
  }

  /**
   * Inside the caller's transaction, for a caller that changes more than
   * reputation at once (a match result, a moderation decision). The caller
   * must already hold the account's lock and flushes.
   */
  applyIn(
    em: EntityManager,
    account: Account,
    reason: AutomaticReputationReason,
    lobbyId?: string,
  ): Promise<ReputationChange> {
    return this.record(em, account, reputationDelta(reason, account.reputation), reason, lobbyId)
  }

  /**
   * A match expired with no report (4.1, RF-071): the escalation counts this
   * account's zero-reports of the last 30 days. Same contract as `applyIn`.
   * The delta is stored and kept on a recompute: the escalation depends on
   * dates, not on the value before it.
   */
  async zeroReportIn(
    em: EntityManager,
    account: Account,
    lobbyId: string,
    now: Date,
  ): Promise<ReputationChange> {
    const earlier = await em.count(ReputationEvent, {
      account,
      reason: ReputationEventReason.ZERO_REPORT,
      revertedAt: null,
      createdAt: { $gt: new Date(now.getTime() - ZERO_REPORT_WINDOW_MS), $lte: now },
    })
    return this.record(
      em,
      account,
      zeroReportDelta(earlier, account.reputation),
      ReputationEventReason.ZERO_REPORT,
      lobbyId,
      now,
    )
  }

  /**
   * RF-074: the served suspensions, run by a job. The account is back, at 45;
   * coming back up crosses nothing down, so nothing punishes it again.
   */
  async endSuspensions(now: Date = new Date()): Promise<number> {
    return this.em.fork().transactional(async (em) => {
      const served = await em.find(
        Account,
        { state: AccountState.SUSPENDED, suspensionEndsAt: { $lte: now } },
        { lockMode: LockMode.PESSIMISTIC_WRITE, orderBy: { id: 'asc' } },
      )
      for (const account of served) {
        account.state = account.emailVerified ? AccountState.ACTIVE : AccountState.UNVERIFIED
        account.suspensionEndsAt = undefined
        await this.record(
          em,
          account,
          reputationDelta(ReputationEventReason.SUSPENSION_SERVED, account.reputation),
          ReputationEventReason.SUSPENSION_SERVED,
          undefined,
          now,
        )
      }
      await em.flush()
      return served.length
    })
  }

  /** Every change goes through here, and so does the punishment ladder it may cross. */
  private async record(
    em: EntityManager,
    account: Account,
    delta: number,
    reason: ReputationEventReason,
    lobbyId: string | undefined,
    now: Date = new Date(),
  ): Promise<ReputationChange> {
    const before = account.reputation
    em.create(ReputationEvent, { account, delta, reason, lobbyId, createdAt: now })
    account.reputation = before + delta

    const from = reputationBand(before)
    const to = reputationBand(account.reputation)
    const crossed = from === to ? null : { from, to }
    await punishIn(em, account, crossed, now)
    return { reputation: account.reputation, band: to, crossed }
  }

  /**
   * Rebuilds the account's reputation from its log, in order, from 70 — what
   * a rollback (#210) needs. An event that capped, floored or set the value
   * depended on the ones before it, so taking one out means recomputing each
   * automatic event after it; subtracting its delta would hand out points
   * above the cap. Manual reasons (phase 4.2) keep their stored delta. The
   * caller holds the account lock and flushes.
   */
  async recomputeIn(em: EntityManager, account: Account): Promise<void> {
    const events = await em.find(
      ReputationEvent,
      { account, revertedAt: null },
      { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
    )
    let current = REPUTATION_START
    for (const event of events) {
      if (AUTOMATIC_REASONS.has(event.reason)) {
        event.delta = reputationDelta(event.reason as AutomaticReputationReason, current)
      }
      current = Math.min(100, Math.max(0, current + event.delta))
    }
    account.reputation = current
  }
}
