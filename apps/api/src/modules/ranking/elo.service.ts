import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { GameEdition } from '../../common/domain/game-edition.enum'
import { CharacterCategory } from '../character/archetype'
import { EloEvent } from './elo-event.entity'

/** docs/produto/parametros.md, "Elo". */
export const ELO_BASELINE = 1000

/**
 * Category elo, derived from the event log — #207. There is no column: the
 * number is 1000 plus the unreverted `EloEvent.delta` of every character of
 * the account in that category and edition, including inactive ones. A
 * replacement therefore inherits the rating (RF-027) because the previous
 * character's events stay in the log.
 *
 * Nobody writes this number. A match result (#209) and inactivity decay
 * (#211) insert events; an annulment (#210) marks them reverted, and the
 * next read goes back by itself.
 *
 * Still no HTTP: matchmaking does not exist yet. Callers pass the result of
 * a match as a service input; tests are what check the number.
 */
@Injectable()
export class EloService {
  constructor(private readonly em: EntityManager) {}

  /** Standalone read, on its own fork. */
  of(accountId: string, category: CharacterCategory, edition: GameEdition): Promise<number> {
    return this.ofIn(this.em.fork(), accountId, category, edition)
  }

  /**
   * Inside the caller's transaction, so a writer that just flushed an event
   * sees it. No account lock: this does not write.
   */
  async ofIn(
    em: EntityManager,
    accountId: string,
    category: CharacterCategory,
    edition: GameEdition,
  ): Promise<number> {
    const events = await em.find(
      EloEvent,
      {
        revertedAt: null,
        character: { account: accountId, category, edition },
      },
      { fields: ['delta'] },
    )
    return ELO_BASELINE + events.reduce((sum, event) => sum + event.delta, 0)
  }
}
