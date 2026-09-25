import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { Account } from '../account/account.entity'
import { ReputationEventReason } from './ranking-event.enums'
import { ReputationEvent } from './reputation-event.entity'

/** docs/produto/parametros.md, "Reputação". */
export const CLEAN_MATCH_CAP = 70
export const SUSPENSION_RESTORE = 45
const DISCONNECT_DELTA = -8

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
  | ReputationEventReason.DISCONNECT
  | ReputationEventReason.SUSPENSION_SERVED

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
    case ReputationEventReason.DISCONNECT:
      return Math.max(DISCONNECT_DELTA, 0 - current)
    case ReputationEventReason.SUSPENSION_SERVED:
      // RF-074: back to 45 wherever it was, not +N.
      return SUSPENSION_RESTORE - current
  }
}

export type ReputationChange = {
  reputation: number
  band: ReputationBand
  /** The band just entered, up or down; null when the change stayed inside one. */
  crossed: ReputationBand | null
}

/**
 * The only writer of `Account.reputation` — #208. Every change is a
 * `ReputationEvent` in the same transaction, under the account lock, so two
 * results for one account at once cannot lose an update, and the rollback
 * (#210) can always rebuild the value from the log.
 *
 * A change of zero (a clean match at 70 or above) writes no event: the log
 * records what moved the number, and a zero never did.
 */
@Injectable()
export class ReputationService {
  constructor(private readonly em: EntityManager) {}

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
      const before = account.reputation
      const delta = reputationDelta(reason, before)
      if (delta !== 0) {
        em.create(ReputationEvent, { account, delta, reason, lobbyId })
        account.reputation = before + delta
      }
      await em.flush()

      const band = reputationBand(account.reputation)
      return {
        reputation: account.reputation,
        band,
        crossed: band === reputationBand(before) ? null : band,
      }
    })
  }

  /**
   * Marks events of an annulled match as reverted and takes their delta back
   * off the column (RF-044) — no new event, the log keeps the original with
   * its revertedAt. Runs inside the caller's transaction, which must already
   * hold the lock of every account involved.
   */
  revertEvents(events: ReputationEvent[], at: Date): void {
    for (const event of events) {
      event.revertedAt = at
      event.account.reputation = Math.min(100, Math.max(0, event.account.reputation - event.delta))
    }
  }
}
