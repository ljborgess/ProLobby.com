import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'

import { LobbyParticipation } from '../lobby/lobby-participation.entity'
import { Lobby, LobbyState } from '../lobby/lobby.entity'
import { CaptainCascadeService } from './captain-cascade.service'
import { QueueEntry } from './queue-entry.entity'
import { QueueRefusal } from './queue-refusal.entity'

/** docs/produto/03-partida/02-fila.md: each placed human has 30 s to answer. */
export const CONFIRMATION_WINDOW_MS = 30 * 1000

export const confirmBy = (lobby: Pick<Lobby, 'createdAt'>): Date =>
  new Date(lobby.createdAt.getTime() + CONFIRMATION_WINDOW_MS)

/**
 * The 30 s confirmation after the queue closes a lobby — #232, RF-009, RF-011.
 * All accept: the lobby waits for the captain. A refusal or the 30 s running
 * out: whoever did not accept leaves the queue with a `QueueRefusal`, the
 * others go back to searching with their original `joinedAt`, and the lobby
 * is undone. No reputation event either way.
 */
@Injectable()
export class LobbyConfirmationService {
  constructor(
    private readonly em: EntityManager,
    private readonly cascade: CaptainCascadeService,
  ) {}

  async respond(accountId: string, accept: boolean, now: Date = new Date()): Promise<void> {
    await this.em.fork().transactional(async (em) => {
      const entry = await em.findOne(QueueEntry, { account: accountId, lobby: { $ne: null } })
      if (!entry?.lobby) {
        throw new NotFoundException('no_lobby_to_confirm')
      }
      // The lobby row serializes every answer to it, and the expiry run.
      const lobby = await em.findOneOrFail(
        Lobby,
        { id: entry.lobby.id },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      if (lobby.state !== LobbyState.WAITING_PLAYERS || now > confirmBy(lobby)) {
        throw new ConflictException('confirmation_closed')
      }
      const participations = await em.find(LobbyParticipation, { lobby })
      const mine = participations.find((p) => p.account.id === accountId)!

      if (!accept) {
        // A confirmation from another device wins (decided 2026-09-09).
        if (!mine.confirmedAt) await this.undo(em, lobby, [accountId], now)
        return
      }
      mine.confirmedAt ??= now
      if (participations.every((p) => p.confirmedAt)) {
        lobby.state = LobbyState.WAITING_CAPTAIN
        // Same transaction: the first offer of each side exists the moment
        // the lobby says it is choosing captains (#247).
        await this.cascade.start(em, lobby, now)
      }
      await em.flush()
    })
  }

  /** Lobbies whose 30 s ran out; returns how many were undone. */
  async expire(now: Date = new Date()): Promise<number> {
    return this.em.fork().transactional(async (em) => {
      const lobbies = await em.find(
        Lobby,
        {
          state: LobbyState.WAITING_PLAYERS,
          createdAt: { $lt: new Date(now.getTime() - CONFIRMATION_WINDOW_MS) },
        },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      for (const lobby of lobbies) {
        const silent = await em.find(LobbyParticipation, { lobby, confirmedAt: null })
        await this.undo(
          em,
          lobby,
          silent.map((p) => p.account.id),
          now,
        )
      }
      return lobbies.length
    })
  }

  private async undo(
    em: EntityManager,
    lobby: Lobby,
    refusers: string[],
    now: Date,
  ): Promise<void> {
    for (const accountId of refusers) {
      em.create(QueueRefusal, { account: accountId, lobbyId: lobby.id, createdAt: now })
    }
    await em.flush()
    await em.nativeDelete(QueueEntry, { lobby, account: { $in: refusers } })
    // The others' entries lose the lobby by the foreign key (set null) and
    // search again with their joinedAt; the participations go with it.
    await em.nativeDelete(Lobby, { id: lobby.id })
  }
}
