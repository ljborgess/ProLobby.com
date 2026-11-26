import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable, NotFoundException } from '@nestjs/common'

import { CURRENT_EDITION } from '../../common/domain/game-edition.enum'
import { Account } from '../account/account.entity'
import { AccountState } from '../account/account.enums'
import type { Archetype, CharacterCategory } from '../character/archetype'
import { Character, CharacterState } from '../character/character.entity'
import { LobbyParticipation, LobbySide } from '../lobby/lobby-participation.entity'
import { Lobby, LobbyState } from '../lobby/lobby.entity'
import { EloEvent } from './elo-event.entity'
import { EloService, eloOf } from './elo.service'
import { EloEventReason } from './ranking-event.enums'

/** A match that happened: a score, an expiry without one, a dispute or its annulment. Never a cancelled lobby. */
const PLAYED_STATES = [
  LobbyState.FINISHED,
  LobbyState.NOT_CONFIRMED,
  LobbyState.IN_DISPUTE,
  LobbyState.EXPIRED_NO_REPORT,
  LobbyState.ANNULLED,
]
/** The states with a score that stands: what the win/draw/loss record counts. */
const SCORED_STATES = [LobbyState.FINISHED, LobbyState.NOT_CONFIRMED]
export const HISTORY_PAGE = 20

type Result = 'win' | 'draw' | 'loss'
type Person = { accountId: string; nickname: string | null; category: CharacterCategory }

export type PublicProfile = {
  accountId: string
  nickname: string | null
  reputation: number
  characters: { category: CharacterCategory; archetype: Archetype; elo: number }[]
  record: Record<Result, number>
}

export type MatchHistoryItem = {
  lobbyId: string
  playedAt: Date
  state: LobbyState
  category: CharacterCategory
  /** This account's side's goals first; null while there is no score that stands. */
  score: { mine: number; theirs: number } | null
  result: Result | null
  /** The elo the match moved for this account; 0 once annulled. */
  eloDelta: number
  /** Its result events were reverted (RF-044): the match no longer counts. */
  annulled: boolean
  lineup: { mine: Person[]; theirs: Person[] }
}

/**
 * The public profile and its match history (RF-016, RF-018, #337). Reached by
 * id only, from the ranking, a shared match or a lobby: nothing here takes a
 * name to search. What 03-perfil.md makes public (nickname, elo, reputation,
 * aggregate history) and nothing raw: no gamertag, Discord, print or club.
 */
@Injectable()
export class ProfileService {
  constructor(
    private readonly em: EntityManager,
    private readonly eloService: EloService,
  ) {}

  async profile(accountId: string): Promise<PublicProfile> {
    const em = this.em.fork()
    const account = await this.visible(em, accountId)
    const [characters, elo, record] = await Promise.all([
      em.find(Character, {
        account: accountId,
        edition: CURRENT_EDITION,
        state: CharacterState.VERIFIED,
      }),
      this.eloService.byCategory(accountId, CURRENT_EDITION),
      this.record(em, accountId),
    ])
    return {
      accountId,
      nickname: account.nickname ?? null,
      reputation: account.reputation,
      characters: characters
        .map((c) => ({ category: c.category, archetype: c.archetype, elo: eloOf(elo, c.category) }))
        .sort((a, b) => a.category.localeCompare(b.category)),
      record,
    }
  }

  /** Newest first, 20 a page; `before` is the last lobby of the previous page. */
  async matches(
    accountId: string,
    before?: string,
  ): Promise<{ items: MatchHistoryItem[]; next: string | null }> {
    const em = this.em.fork()
    await this.visible(em, accountId)
    const cursor = before ? await em.findOne(Lobby, { id: before }) : null
    if (before && !cursor) throw new NotFoundException('cursor_not_found')

    const mine = await em.find(
      LobbyParticipation,
      {
        account: accountId,
        lobby: {
          state: { $in: PLAYED_STATES },
          ...(cursor && {
            $or: [
              { createdAt: { $lt: cursor.createdAt } },
              { createdAt: cursor.createdAt, id: { $lt: cursor.id } },
            ],
          }),
        },
      },
      {
        populate: ['lobby'],
        orderBy: { lobby: { createdAt: 'desc', id: 'desc' } },
        limit: HISTORY_PAGE + 1,
      },
    )
    const page = mine.slice(0, HISTORY_PAGE)
    const lobbyIds = page.map((p) => p.lobby.id)
    const [everyone, events] = await Promise.all([
      em.find(LobbyParticipation, { lobby: { $in: lobbyIds } }, { populate: ['account'] }),
      em.find(EloEvent, {
        lobbyId: { $in: lobbyIds },
        reason: EloEventReason.MATCH_RESULT,
        character: { account: accountId },
      }),
    ])

    const items = page.map((p): MatchHistoryItem => {
      const lobby = p.lobby
      const own = events.filter((e) => e.lobbyId === lobby.id)
      // Annulled by moderation in a dispute (#342), or its result events reverted (RF-044).
      const annulled =
        lobby.state === LobbyState.ANNULLED || (own.length > 0 && own.every((e) => e.revertedAt))
      const score = scoreFor(lobby, p.side, annulled)
      const person = (q: LobbyParticipation): Person => ({
        accountId: q.account.id,
        nickname: q.account.nickname ?? null,
        category: q.category,
      })
      const roster = everyone.filter((q) => q.lobby.id === lobby.id)
      return {
        lobbyId: lobby.id,
        playedAt: lobby.closedAt ?? lobby.createdAt,
        state: lobby.state,
        category: p.category,
        score,
        result: score ? resultOf(score.mine, score.theirs) : null,
        eloDelta: own.filter((e) => !e.revertedAt).reduce((sum, e) => sum + e.delta, 0),
        annulled,
        lineup: {
          mine: roster.filter((q) => q.side === p.side).map(person),
          theirs: roster.filter((q) => q.side !== p.side).map(person),
        },
      }
    })
    return {
      items,
      next: mine.length > HISTORY_PAGE ? (page.at(-1)?.lobby.id ?? null) : null,
    }
  }

  /** Banned or deleted is the same 404 as an id that never existed. */
  private async visible(em: EntityManager, accountId: string): Promise<Account> {
    const account = await em.findOne(Account, {
      id: accountId,
      state: { $nin: [AccountState.BANNED, AccountState.DELETED] },
    })
    if (!account) throw new NotFoundException('profile_not_found')
    return account
  }

  /** Every scored match that was not annulled, as wins, draws and losses. */
  private async record(em: EntityManager, accountId: string): Promise<Record<Result, number>> {
    // ponytail: reads every scored match of the account; an aggregate query once histories run long.
    const scored = await em.find(
      LobbyParticipation,
      { account: accountId, lobby: { state: { $in: SCORED_STATES } } },
      { populate: ['lobby'] },
    )
    const reverted = new Set(
      (
        await em.find(EloEvent, {
          lobbyId: { $in: scored.map((p) => p.lobby.id) },
          reason: EloEventReason.MATCH_RESULT,
          character: { account: accountId },
          revertedAt: { $ne: null },
        })
      ).map((e) => e.lobbyId),
    )
    const record: Record<Result, number> = { win: 0, draw: 0, loss: 0 }
    for (const p of scored) {
      const score = scoreFor(p.lobby, p.side, reverted.has(p.lobby.id))
      if (score) record[resultOf(score.mine, score.theirs)]++
    }
    return record
  }
}

function scoreFor(
  lobby: Lobby,
  side: LobbySide,
  annulled: boolean,
): { mine: number; theirs: number } | null {
  if (annulled || !SCORED_STATES.includes(lobby.state)) return null
  if (lobby.scoreA == null || lobby.scoreB == null) return null
  return side === LobbySide.A
    ? { mine: lobby.scoreA, theirs: lobby.scoreB }
    : { mine: lobby.scoreB, theirs: lobby.scoreA }
}

const resultOf = (mine: number, theirs: number): Result =>
  mine > theirs ? 'win' : mine < theirs ? 'loss' : 'draw'
