import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import { FORMATIONS, FormationVote } from '../lobby/formation-vote.entity'
import { LobbyParticipation, LobbySide } from '../lobby/lobby-participation.entity'
import { Lobby, TERMINAL_LOBBY_STATES } from '../lobby/lobby.entity'
import { QueueEntry } from './queue-entry.entity'

/** RF-034: from the moment the bot created the channels. */
export const FORMATION_VOTE_MS = 60 * 1000

export const formationVoteBy = (lobby: Pick<Lobby, 'formationVoteStartedAt'>): Date | null =>
  lobby.formationVoteStartedAt
    ? new Date(lobby.formationVoteStartedAt.getTime() + FORMATION_VOTE_MS)
    : null

export interface FormationView {
  options: readonly string[]
  /** End of the 60 s; null until the bot created the channels. */
  voteBy: Date | null
  myVote: string | null
  /** The job counted the votes; before that, past the 60 s, the count is due. */
  counted: boolean
  /** The formation of this account's side, once decided. */
  chosen: string | null
  /** Only for the captain, only while the side waits on them: what they may pick. */
  captainChoices: string[] | null
}

/**
 * The formation vote of each side — #249, RF-034.
 *
 * Opens when the bot reports the channels (`LobbyChannelsService`), runs 60 s
 * alongside the invite window. Only humans of the side vote, one vote each,
 * changeable until the end. Then the most voted wins; a tie goes to the
 * captain among the tied, and no vote at all lets the captain pick any.
 * Nothing here touches who plays or the elo.
 */
@Injectable()
export class FormationVoteService {
  constructor(private readonly em: EntityManager) {}

  async vote(accountId: string, formation: string, now: Date = new Date()): Promise<void> {
    await this.em.fork().transactional(async (em) => {
      const { lobby } = await this.mine(em, accountId)
      const voteBy = formationVoteBy(lobby)
      if (!voteBy || now > voteBy || lobby.formationVoteClosedAt) {
        throw new ConflictException('formation_vote_closed')
      }
      const existing = await em.findOne(FormationVote, { lobby, account: accountId })
      if (existing) {
        existing.formation = formation
        existing.votedAt = now
      } else {
        em.create(FormationVote, { lobby, account: accountId, formation, votedAt: now })
      }
      await em.flush()
    })
  }

  /** The captain settles a tie, or picks when nobody voted. */
  async choose(accountId: string, formation: string, now: Date = new Date()): Promise<void> {
    await this.em.fork().transactional(async (em) => {
      const { lobby, mine } = await this.mine(em, accountId)
      if (captainOf(lobby, mine.side) !== accountId) {
        throw new NotFoundException('not_a_captain')
      }
      // The 60 s are over but the job has not counted yet: count here, so the
      // captain is not told "not pending" for the few seconds in between.
      const voteBy = formationVoteBy(lobby)
      if (!lobby.formationVoteClosedAt && voteBy && now > voteBy) {
        await this.count(em, lobby, now)
      }
      if (!lobby.formationVoteClosedAt || formationOf(lobby, mine.side)) {
        throw new ConflictException('formation_not_pending')
      }
      const choices = leaders(await this.votesOf(em, lobby, mine.side))
      if (!choices.includes(formation)) {
        throw new BadRequestException('formation_not_allowed')
      }
      setFormation(lobby, mine.side, formation)
      await em.flush()
    })
  }

  /** The clock's part, run by the queue job: counts the votes past the 60 s. */
  async close(now: Date = new Date()): Promise<number> {
    return this.em.fork().transactional(async (em) => {
      const lobbies = await em.find(
        Lobby,
        {
          formationVoteStartedAt: { $lte: new Date(now.getTime() - FORMATION_VOTE_MS) },
          formationVoteClosedAt: null,
          state: { $nin: [...TERMINAL_LOBBY_STATES] },
        },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      for (const lobby of lobbies) {
        await this.count(em, lobby, now)
      }
      await em.flush()
      return lobbies.length
    })
  }

  /** Counts both sides of a locked lobby. */
  private async count(em: EntityManager, lobby: Lobby, now: Date): Promise<void> {
    for (const side of [LobbySide.A, LobbySide.B]) {
      const top = leaders(await this.votesOf(em, lobby, side))
      // One leader is a winner; a tie or no vote waits on the captain.
      if (top.length === 1) setFormation(lobby, side, top[0]!)
    }
    lobby.formationVoteClosedAt = now
  }

  /** What the lobby screen shows of the vote (`GET /api/queue`). */
  async view(em: EntityManager, lobby: Lobby, mine: LobbyParticipation): Promise<FormationView> {
    const myVote = await em.findOne(FormationVote, { lobby, account: mine.account.id })
    const chosen = formationOf(lobby, mine.side) ?? null
    const pendingOnMe =
      !!lobby.formationVoteClosedAt && !chosen && captainOf(lobby, mine.side) === mine.account.id
    return {
      options: FORMATIONS,
      voteBy: formationVoteBy(lobby),
      myVote: myVote?.formation ?? null,
      counted: !!lobby.formationVoteClosedAt,
      chosen,
      captainChoices: pendingOnMe ? leaders(await this.votesOf(em, lobby, mine.side)) : null,
    }
  }

  private async mine(em: EntityManager, accountId: string) {
    const entry = await em.findOne(QueueEntry, { account: accountId, lobby: { $ne: null } })
    if (!entry?.lobby) {
      throw new NotFoundException('no_lobby')
    }
    const lobby = await em.findOneOrFail(
      Lobby,
      { id: entry.lobby.id },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    )
    const mine = await em.findOneOrFail(LobbyParticipation, { lobby, account: accountId })
    return { lobby, mine }
  }

  /** The votes of one side: the side comes from each voter's participation. */
  private async votesOf(em: EntityManager, lobby: Lobby, side: LobbySide): Promise<string[]> {
    const humans = await em.find(LobbyParticipation, { lobby, side })
    const votes = await em.find(FormationVote, {
      lobby,
      account: { $in: humans.map((h) => h.account.id) },
    })
    return votes.map((v) => v.formation)
  }
}

/** The most voted formations; every formation when nobody voted. */
function leaders(votes: string[]): string[] {
  if (votes.length === 0) return [...FORMATIONS]
  const count = new Map<string, number>()
  for (const formation of votes) count.set(formation, (count.get(formation) ?? 0) + 1)
  const top = Math.max(...count.values())
  return FORMATIONS.filter((formation) => count.get(formation) === top)
}

function captainOf(lobby: Lobby, side: LobbySide): string | undefined {
  return (side === LobbySide.A ? lobby.captainA : lobby.captainB)?.id
}

function formationOf(lobby: Lobby, side: LobbySide): string | undefined {
  return side === LobbySide.A ? lobby.formationA : lobby.formationB
}

function setFormation(lobby: Lobby, side: LobbySide, formation: string): void {
  if (side === LobbySide.A) lobby.formationA = formation
  else lobby.formationB = formation
}
