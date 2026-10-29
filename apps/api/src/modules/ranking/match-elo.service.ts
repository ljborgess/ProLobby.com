import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable, Logger } from '@nestjs/common'

import { ACTIVE_CHARACTER_STATES, Character, CharacterState } from '../character/character.entity'
import { LobbyParticipation, LobbySide } from '../lobby/lobby-participation.entity'
import { Lobby } from '../lobby/lobby.entity'
import { EloEvent } from './elo-event.entity'
import { EloEventReason } from './ranking-event.enums'

/** docs/produto/parametros.md, "Elo": 32 up to the 9th match in the category, 20 from the 10th. */
export const K_CALIBRATING = 32
export const K_SETTLED = 20
const CALIBRATION_MATCHES = 9

export const kFactor = (matchesBefore: number): number =>
  matchesBefore < CALIBRATION_MATCHES ? K_CALIBRATING : K_SETTLED

/** Standard Elo: 1 a win, 0.5 a draw, 0 a loss, against the expected score. */
export function eloDelta(k: number, own: number, other: number, score: 0 | 0.5 | 1): number {
  const expected = 1 / (1 + 10 ** ((other - own) / 400))
  return Math.round(k * (score - expected))
}

/**
 * A finished match becomes elo — RF-077, #209. The expected score uses the
 * mean of each side's humans, frozen at queue entry; AI slots are not rows,
 * so they never enter it. Each human gets its own K-factor, so equal sides
 * can move different amounts.
 *
 * Contract with the rollback (#210): one `match_result` per human, with the
 * lobby id, on the category's active character, which also counts the match.
 */
@Injectable()
export class MatchEloService {
  private readonly logger = new Logger(MatchEloService.name)

  /**
   * Inside the caller's transaction, with the accounts already locked in id
   * order (the reputation writer's lock). Returns how many events it wrote:
   * none for a lobby that already had its result, annulled or not.
   */
  async applyIn(em: EntityManager, lobby: Lobby): Promise<number> {
    if (await em.count(EloEvent, { lobbyId: lobby.id, reason: EloEventReason.MATCH_RESULT })) {
      return 0
    }
    const rows = await em.find(LobbyParticipation, { lobby }, { populate: ['character'] })
    const mean = (side: LobbySide) => {
      const elos = rows.filter((row) => row.side === side).map((row) => row.eloAtEntry)
      return elos.reduce((sum, elo) => sum + elo, 0) / elos.length
    }
    const means = { [LobbySide.A]: mean(LobbySide.A), [LobbySide.B]: mean(LobbySide.B) }
    const goals = { [LobbySide.A]: lobby.scoreA!, [LobbySide.B]: lobby.scoreB! }

    let written = 0
    for (const row of rows) {
      const other = row.side === LobbySide.A ? LobbySide.B : LobbySide.A
      const score = goals[row.side] > goals[other] ? 1 : goals[row.side] === goals[other] ? 0.5 : 0
      const active = await em.findOne(Character, {
        account: row.account,
        category: row.category,
        edition: row.character.edition,
        state: { $in: [...ACTIVE_CHARACTER_STATES] },
      })
      if (active?.state !== CharacterState.VERIFIED) {
        // Verification revoked mid-match: the match stands for everyone
        // else, this one is left for moderation to look at.
        this.logger.warn(`lobby ${lobby.id}: participation ${row.id} has no verified character`)
        continue
      }
      em.create(EloEvent, {
        character: active,
        delta: eloDelta(kFactor(active.matchesInCategory), means[row.side], means[other], score),
        reason: EloEventReason.MATCH_RESULT,
        lobbyId: lobby.id,
      })
      active.matchesInCategory += 1
      written += 1
    }
    await em.flush()
    return written
  }
}
