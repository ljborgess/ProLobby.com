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
 * Undoes an annulled match — RF-044, RF-075, #210. Every elo and reputation
 * event of the lobby is marked reverted, never deleted, so elo (derived from
 * the events) and reputation go back to what they were, and the match leaves
 * `matchesInCategory` (and with it the K-factor). No new reputation event:
 * an annulment is nobody's fault.
 *
 * Who annuls, and when, is moderation's (phase 4.2) and the neutral verdict's
 * (RF-075); this is the operation they call.
 */
@Injectable()
export class MatchRollbackService {
  constructor(
    private readonly em: EntityManager,
    private readonly reputationService: ReputationService,
  ) {}

  revertLobby(lobbyId: string): Promise<LobbyRollback> {
    return this.em.fork().transactional(async (em) => {
      // Accounts first, in a fixed order: the same lock every writer of
      // these rows takes, and two rollbacks at once cannot deadlock.
      const accountIds = await this.accountsOf(em, lobbyId)
      for (const id of accountIds) {
        await em.findOneOrFail(Account, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE })
      }
      // Read after the locks: a second rollback of the same lobby finds
      // nothing left to revert.
      const eloEvents = await em.find(
        EloEvent,
        { lobbyId, revertedAt: null },
        { populate: ['character'], refresh: true },
      )
      const reputationEvents = await em.find(
        ReputationEvent,
        { lobbyId, revertedAt: null },
        { refresh: true },
      )

      const now = new Date()
      for (const event of eloEvents) {
        event.revertedAt = now
        if (event.reason === EloEventReason.MATCH_RESULT) {
          await this.takeMatchBack(em, event.character)
        }
      }
      this.reputationService.revertEvents(reputationEvents, now)
      await em.flush()
      return { eloEvents: eloEvents.length, reputationEvents: reputationEvents.length }
    })
  }

  private async accountsOf(em: EntityManager, lobbyId: string): Promise<string[]> {
    const [elo, reputation] = await Promise.all([
      em.find(EloEvent, { lobbyId, revertedAt: null }, { populate: ['character'] }),
      em.find(ReputationEvent, { lobbyId, revertedAt: null }),
    ])
    const ids = new Set([
      ...elo.map((event) => event.character.account.id),
      ...reputation.map((event) => event.account.id),
    ])
    return [...ids].sort()
  }

  /**
   * The match leaves the character that played it and, when that one has
   * since been replaced, the active character of the category too: the
   * replacement inherited the count (RF-027), this match included.
   */
  private async takeMatchBack(em: EntityManager, played: Character): Promise<void> {
    const characters = new Set([played])
    if (!(ACTIVE_CHARACTER_STATES as readonly string[]).includes(played.state)) {
      const active = await em.findOne(Character, {
        account: played.account,
        category: played.category,
        edition: played.edition,
        state: { $in: [...ACTIVE_CHARACTER_STATES] },
      })
      if (active) {
        characters.add(active)
      }
    }
    for (const character of characters) {
      character.matchesInCategory = Math.max(0, character.matchesInCategory - 1)
    }
  }
}
