import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { Account } from '../account/account.entity'
import { ACTIVE_CHARACTER_STATES, Character } from '../character/character.entity'
import { EloEvent } from './elo-event.entity'
import { EloEventReason } from './ranking-event.enums'
import { ReputationEvent } from './reputation-event.entity'
import { ReputationService } from './reputation.service'

export type LobbyRollback = { eloEvents: number; reputationEvents: number }

/**
 * Undoes an annulled match — RF-044, RF-075, #210. Every result event of the
 * lobby is marked reverted, never deleted, and no new event is written: an
 * annulment is nobody's fault. Elo (derived from the events) goes back by
 * itself; reputation is replayed from its log; the match leaves the
 * category's count, and with it the K-factor.
 *
 * Contract with the match result (#209): a result counts one match on the
 * category's active character. The rollback takes it from the same place.
 *
 * Who annuls, and when, is moderation's (phase 4.2) and the neutral verdict's
 * (RF-075); this is the operation they call. Later matches keep the K-factor
 * and expected score they were computed with — a recalculation of the chain
 * after an annulled match is out of scope (03-dados.md).
 */
@Injectable()
export class MatchRollbackService {
  constructor(
    private readonly em: EntityManager,
    private readonly reputationService: ReputationService,
  ) {}

  /** Standalone: its own transaction. */
  revertLobby(lobbyId: string): Promise<LobbyRollback> {
    return this.em.fork().transactional((em) => this.revertLobbyIn(em, lobbyId))
  }

  /**
   * Inside the caller's transaction (a moderation decision that also closes
   * its case). Takes the locks of the accounts involved itself; the caller
   * must not hold other account locks, or the fixed order is lost.
   */
  async revertLobbyIn(em: EntityManager, lobbyId: string): Promise<LobbyRollback> {
    // Accounts in a fixed order: the lock every writer of these rows takes,
    // and two rollbacks sharing accounts cannot deadlock. Read the events
    // after the locks; if one for an account not locked yet landed in
    // between, lock it and read again.
    const locked = new Set<string>()
    let eloEvents: EloEvent[] = []
    let reputationEvents: ReputationEvent[] = []
    for (;;) {
      ;[eloEvents, reputationEvents] = await this.eventsOf(em, lobbyId)
      const missing = accountsOf(eloEvents, reputationEvents).filter((id) => !locked.has(id))
      if (missing.length === 0) {
        break
      }
      for (const id of missing.sort()) {
        await em.findOneOrFail(Account, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE })
        locked.add(id)
      }
    }

    const now = new Date()
    for (const event of eloEvents) {
      event.revertedAt = now
      await this.takeMatchBack(em, event.character)
    }
    for (const event of reputationEvents) {
      event.revertedAt = now
    }
    const accounts = new Set(reputationEvents.map((event) => event.account))
    for (const account of accounts) {
      await this.reputationService.recomputeIn(em, account)
    }
    await em.flush()
    return { eloEvents: eloEvents.length, reputationEvents: reputationEvents.length }
  }

  private eventsOf(em: EntityManager, lobbyId: string): Promise<[EloEvent[], ReputationEvent[]]> {
    return Promise.all([
      // Only results: anything else carrying a lobby id is not the match.
      em.find(
        EloEvent,
        { lobbyId, reason: EloEventReason.MATCH_RESULT, revertedAt: null },
        { populate: ['character'], refresh: true },
      ),
      em.find(ReputationEvent, { lobbyId, revertedAt: null }, { refresh: true }),
    ])
  }

  /**
   * The match leaves the category's active character, which is where the
   * result counted it (see the contract above); a replacement inherited the
   * count along with it (RF-027). With no active one left (archived
   * edition), the character that played.
   */
  private async takeMatchBack(em: EntityManager, played: Character): Promise<void> {
    const active =
      (await em.findOne(Character, {
        account: played.account,
        category: played.category,
        edition: played.edition,
        state: { $in: [...ACTIVE_CHARACTER_STATES] },
      })) ?? played
    active.matchesInCategory = Math.max(0, active.matchesInCategory - 1)
  }
}

function accountsOf(elo: EloEvent[], reputation: ReputationEvent[]): string[] {
  return [
    ...new Set([
      ...elo.map((event) => event.character.account.id),
      ...reputation.map((event) => event.account.id),
    ]),
  ]
}
