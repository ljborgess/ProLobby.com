import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { CURRENT_EDITION } from '../../common/domain/game-edition.enum'
import { Account } from '../account/account.entity'
import { CharacterCategory } from '../character/archetype'
import { ACTIVE_CHARACTER_STATES, Character } from '../character/character.entity'
import { EloEvent } from './elo-event.entity'
import { ELO_BASELINE, EloService } from './elo.service'
import { EloEventReason } from './ranking-event.enums'

/** docs/produto/parametros.md, "Decaimento por inatividade" (RF-017). */
export const DECAY_GRACE_DAYS = 60
export const DECAY_PERIOD_DAYS = 30
export const DECAY_STEP = 25

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * How many cuts a category owes after this many days without a match: none
 * before day 90, one on day 90, another every 30 days after that.
 */
export function cutsDue(daysIdle: number): number {
  if (daysIdle < DECAY_GRACE_DAYS + DECAY_PERIOD_DAYS) {
    return 0
  }
  return Math.floor((daysIdle - DECAY_GRACE_DAYS) / DECAY_PERIOD_DAYS)
}

/**
 * Inactivity decay — RF-017, #211. A category that went 60 days without a
 * match loses 25 elo every 30 days, the first cut on day 90, never below the
 * 1000 baseline. Each cut is an `inactivity_decay` event; playing stops the
 * count, and the elo lost does not come back.
 *
 * The count, not a schedule, makes it idempotent: the cuts owed since the
 * last match minus the cuts already in the log is what one run writes, so
 * running twice in a day writes nothing the second time. The last match is
 * the latest unreverted `match_result` of any character of the account in
 * that category and edition, because the elo is the category's (#207); an
 * annulled match (#210) does not count.
 */
@Injectable()
export class EloDecayService {
  constructor(
    private readonly em: EntityManager,
    private readonly eloService: EloService,
  ) {}

  /** Runs every category that ever played; returns how many cuts it wrote. */
  async decay(now: Date = new Date()): Promise<number> {
    let written = 0
    for (const group of await this.playedGroups()) {
      written += await this.decayGroup(group.accountId, group.category, now)
    }
    return written
  }

  /**
   * Only a category with a result can be above 1000, so only those are
   * looked at. ponytail: one pass over every result of the edition; switch
   * to a grouped SQL query when the log grows past what a daily job reads.
   */
  private async playedGroups(): Promise<{ accountId: string; category: CharacterCategory }[]> {
    const results = await this.em.fork().find(
      EloEvent,
      {
        reason: EloEventReason.MATCH_RESULT,
        revertedAt: null,
        character: { edition: CURRENT_EDITION },
      },
      { fields: ['character.account', 'character.category'] },
    )
    const groups = new Map<string, { accountId: string; category: CharacterCategory }>()
    for (const event of results) {
      const accountId = event.character.account.id
      const category = event.character.category
      groups.set(`${accountId}:${category}`, { accountId, category })
    }
    return [...groups.values()]
  }

  private decayGroup(accountId: string, category: CharacterCategory, now: Date): Promise<number> {
    return this.em.fork().transactional(async (em) => {
      // The lock every writer of this account's elo takes: a result or an
      // annulment landing now cannot interleave with the count below.
      await em.findOneOrFail(Account, { id: accountId }, { lockMode: LockMode.PESSIMISTIC_WRITE })
      const inGroup = { account: accountId, category, edition: CURRENT_EDITION }

      const lastMatch = await em.findOne(
        EloEvent,
        { reason: EloEventReason.MATCH_RESULT, revertedAt: null, character: inGroup },
        { orderBy: { createdAt: 'desc' }, fields: ['createdAt'] },
      )
      if (!lastMatch) {
        return 0
      }
      const owed = cutsDue(Math.floor((now.getTime() - lastMatch.createdAt.getTime()) / DAY_MS))
      const done = await em.count(EloEvent, {
        reason: EloEventReason.INACTIVITY_DECAY,
        revertedAt: null,
        createdAt: { $gt: lastMatch.createdAt },
        character: inGroup,
      })
      if (owed <= done) {
        return 0
      }

      const target = await this.carrier(em, accountId, category)
      let elo = await this.eloService.ofIn(em, accountId, category, CURRENT_EDITION)
      let written = 0
      for (let cut = done; cut < owed && elo > ELO_BASELINE; cut += 1) {
        const delta = -Math.min(DECAY_STEP, elo - ELO_BASELINE)
        em.create(EloEvent, {
          character: target,
          delta,
          reason: EloEventReason.INACTIVITY_DECAY,
          createdAt: now,
        })
        elo += delta
        written += 1
      }
      await em.flush()
      return written
    })
  }

  /** The event goes on the category's active character, or its latest one. */
  private async carrier(
    em: EntityManager,
    accountId: string,
    category: CharacterCategory,
  ): Promise<Character> {
    const inGroup = { account: accountId, category, edition: CURRENT_EDITION }
    return (
      (await em.findOne(Character, { ...inGroup, state: { $in: [...ACTIVE_CHARACTER_STATES] } })) ??
      (await em.findOneOrFail(Character, inGroup, { orderBy: { createdAt: 'desc' } }))
    )
  }
}
