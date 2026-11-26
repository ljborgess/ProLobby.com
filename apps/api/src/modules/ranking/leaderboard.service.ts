import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { CURRENT_EDITION } from '../../common/domain/game-edition.enum'
import { AccountState } from '../account/account.enums'
import type { Archetype, CharacterCategory } from '../character/archetype'
import { CharacterState } from '../character/character.entity'
import { ELO_BASELINE } from './elo.service'
import { EloEventReason } from './ranking-event.enums'

/** RF-015: at most 50, and only accounts with a match in the last 30 days. */
export const LEADERBOARD_SIZE = 50
export const LEADERBOARD_ACTIVE_DAYS = 30

export type LeaderboardRow = {
  position: number
  /** Opens the public profile (#337): reached from here, never searched (RF-016). */
  accountId: string
  /** The platform nickname (#335); null shows as "sem apelido". Never the gamertag. */
  nickname: string | null
  archetype: Archetype
  elo: number
}

/**
 * The five rankings, one per category (RF-014, #336). Elo belongs to the
 * account in a category and edition, not to one character row: a replaced
 * character's events still count, as in `EloService.ofIn`. The row shows the
 * account's verified character of that category, which the partial unique
 * index keeps to one.
 */
@Injectable()
export class LeaderboardService {
  constructor(private readonly em: EntityManager) {}

  async top(category: CharacterCategory, now: Date = new Date()): Promise<LeaderboardRow[]> {
    const since = new Date(now.getTime() - LEADERBOARD_ACTIVE_DAYS * 24 * 60 * 60 * 1000)
    const rows = await this.em
      .fork()
      .getConnection()
      .execute<
        { account_id: string; nickname: string | null; archetype: Archetype; elo: string }[]
      >(
        `select c.account_id, a.nickname, c.archetype,
              ${ELO_BASELINE} + coalesce((
                select sum(e.delta) from elo_event e
                join "character" ec on ec.id = e.character_id
                where ec.account_id = c.account_id and ec.category = c.category
                  and ec.edition = c.edition and e.reverted_at is null
              ), 0) as elo
       from "character" c
       join account a on a.id = c.account_id
       where c.category = ? and c.edition = ? and c.state = ?
         and a.state not in (?, ?)
         and exists (
           select 1 from elo_event m
           join "character" mc on mc.id = m.character_id
           where mc.account_id = c.account_id and m.reason = ?
             and m.reverted_at is null and m.created_at > ?
         )
       order by elo desc, c.account_id
       limit ?`,
        [
          category,
          CURRENT_EDITION,
          CharacterState.VERIFIED,
          AccountState.BANNED,
          AccountState.DELETED,
          EloEventReason.MATCH_RESULT,
          since,
          LEADERBOARD_SIZE,
        ],
      )
    return rows.map((row, index) => ({
      position: index + 1,
      accountId: row.account_id,
      nickname: row.nickname,
      archetype: row.archetype,
      elo: Number(row.elo),
    }))
  }
}
