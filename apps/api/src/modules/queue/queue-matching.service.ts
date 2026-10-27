import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { Account } from '../account/account.entity'
import { AccountState } from '../account/account.enums'
import { DeclaredClub } from '../account/declared-club.entity'
import { Character } from '../character/character.entity'
import { LobbyParticipation, LobbySide } from '../lobby/lobby-participation.entity'
import { Lobby } from '../lobby/lobby.entity'
import { type Candidate, findMatch } from './matchmaker'
import { QueueEntry } from './queue-entry.entity'
import { QueueStallState } from './queue-stall'
import { missingPrerequisites } from './queue.service'

/**
 * The queue closing matches for real — #231. Runs the matchmaker (#230) over
 * the searching entries until it waits, and turns each result into a lobby.
 */
@Injectable()
export class QueueMatchingService {
  constructor(
    private readonly em: EntityManager,
    private readonly stall: QueueStallState,
  ) {}

  /** Lobbies created by this run; 0 when another run holds the queue. */
  async closeMatches(now: Date = new Date()): Promise<number> {
    return this.em.fork().transactional(async (em) => {
      // One run at a time: two runs reading the same entries would place the
      // same person in two lobbies. Released with the transaction.
      const [lock] = await em.execute<{ locked: boolean }[]>(
        `select pg_try_advisory_xact_lock(hashtext('queue_matching')) as locked`,
      )
      if (!lock?.locked) return 0

      // Row locks too, so a leave in flight waits for this run and then finds
      // the entry placed (QueueService.leave).
      const entries = await em.find(
        QueueEntry,
        { lobby: null },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      let remaining = await this.candidatesOf(em, entries)
      const entryById = new Map(entries.map((entry) => [entry.id, entry]))

      let lobbies = 0
      for (;;) {
        const result = findMatch(remaining, now)
        if (result.kind === 'wait') {
          this.stall.record(result.unpaired, result.captainMissing)
          break
        }

        // Born at the run's clock: the 30 s confirmation counts from here (#232).
        const lobby = em.create(Lobby, { createdAt: now })
        result.sides.forEach((side, index) => {
          for (const candidate of side) {
            const entry = entryById.get(candidate.id)!
            entry.lobby = lobby
            em.create(LobbyParticipation, {
              lobby,
              account: entry.account,
              character: entry.character,
              side: index === 0 ? LobbySide.A : LobbySide.B,
              category: entry.category,
            })
          }
        })
        const placed = new Set(result.sides.flat().map((candidate) => candidate.id))
        remaining = remaining.filter((candidate) => !placed.has(candidate.id))
        lobbies += 1
      }
      await em.flush()
      return lobbies
    })
  }

  /**
   * The entries still fit to play. Prerequisites are checked again: an account
   * suspended, or out of the Discord server, after joining stays in the queue
   * but is not placed.
   */
  private async candidatesOf(em: EntityManager, entries: QueueEntry[]): Promise<Candidate[]> {
    if (entries.length === 0) return []
    const accountIds = entries.map((entry) => entry.account.id)
    const [accounts, characters, clubs] = await Promise.all([
      em.find(Account, { id: { $in: accountIds } }),
      em.find(Character, { id: { $in: entries.map((entry) => entry.character.id) } }),
      em.find(DeclaredClub, { account: { $in: accountIds } }),
    ])
    const accountById = new Map(accounts.map((account) => [account.id, account]))
    const characterById = new Map(characters.map((character) => [character.id, character]))
    const slotsByAccount = new Map(clubs.map((club) => [club.account.id, club.freeSlots]))

    return entries.flatMap((entry) => {
      const account = accountById.get(entry.account.id)!
      const character = characterById.get(entry.character.id)!
      if (
        account.state !== AccountState.ACTIVE ||
        missingPrerequisites(account, character).length > 0
      ) {
        return []
      }
      return [
        {
          id: entry.id,
          category: entry.category,
          elo: entry.eloAtEntry,
          joinedAt: entry.joinedAt,
          reputation: account.reputation,
          freeSlots: slotsByAccount.get(account.id) ?? null,
        },
      ]
    })
  }
}
