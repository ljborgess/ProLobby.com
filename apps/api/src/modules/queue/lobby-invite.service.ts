import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { LobbyParticipation, LobbySide } from '../lobby/lobby-participation.entity'
import { Lobby, LobbyState } from '../lobby/lobby.entity'
import { ModerationCase } from '../moderation/moderation-case.entity'
import { ModerationCaseOrigin, ModerationCaseType } from '../moderation/moderation-case.enums'
import { EventDeliveryService } from '../bot-integration/event-delivery.service'
import { announceEnded, endLobby } from './end-lobby'
import { QueueEntry } from './queue-entry.entity'

/** From `closed_at` (docs/produto/03-partida/03-lobby.md, "Confirmação de convite recebido"). */
export const INVITE_WINDOW_MS = 5 * 60 * 1000

export const inviteBy = (lobby: Pick<Lobby, 'closedAt'>): Date | null =>
  lobby.closedAt ? new Date(lobby.closedAt.getTime() + INVITE_WINDOW_MS) : null

/**
 * The invite window — #248, states 4, 10 and 11 of 02-estados.md.
 *
 * With both captains confirmed (#247) each human marks the invite to their
 * captain's club as received. Everyone did: `in_progress`. The 5 min ran out
 * with someone of a side still waiting: the lobby is cancelled and everyone
 * searches again with no penalty. Whose fault it was is moderation's call,
 * not ours — a captain who declared the club full is no fault
 * (`cancelled_no_fault`); one who said nothing gets a captain-abuse case
 * (`cancelled_by_captain`).
 *
 * The captain is in their own club already, so their row never counts as
 * waiting.
 */
@Injectable()
export class LobbyInviteService {
  private readonly logger = new Logger(LobbyInviteService.name)

  constructor(
    private readonly em: EntityManager,
    private readonly events: EventDeliveryService,
  ) {}

  /** This account got the invite to its captain's club. */
  async received(accountId: string, now: Date = new Date()): Promise<void> {
    await this.em.fork().transactional(async (em) => {
      const { lobby, participations, mine } = await this.openWindow(em, accountId, now)
      mine.inviteReceivedAt ??= now
      if (waiting(lobby, participations).length === 0) {
        lobby.state = LobbyState.IN_PROGRESS
      }
      await em.flush()
    })
  }

  /** A captain says the club filled up after its last update: no fault if someone is left out. */
  async declareClubFull(accountId: string, now: Date = new Date()): Promise<void> {
    await this.em.fork().transactional(async (em) => {
      const { lobby, mine } = await this.openWindow(em, accountId, now)
      if (captainOf(lobby, mine.side) !== accountId) {
        throw new NotFoundException('not_a_captain')
      }
      mine.clubFullDeclaredAt ??= now
      await em.flush()
    })
  }

  /** The clock's part, run by the queue job. Returns how many lobbies it ended. */
  async expire(now: Date = new Date()): Promise<number> {
    const ended: Lobby[] = []
    const count = await this.em.fork().transactional(async (em) => {
      const lobbies = await em.find(
        Lobby,
        {
          state: LobbyState.WAITING_INVITE,
          closedAt: { $lte: new Date(now.getTime() - INVITE_WINDOW_MS) },
        },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      for (const lobby of lobbies) {
        const participations = await em.find(LobbyParticipation, { lobby })
        const sides = new Set(waiting(lobby, participations).map((p) => p.side))
        if (sides.size === 0) {
          lobby.state = LobbyState.IN_PROGRESS
          continue
        }
        // A captain who declared the club full, or no captain left at all
        // (account deleted), has nobody to answer for the empty seat.
        const atFault = [...sides]
          .map((side) => captainOf(lobby, side))
          .filter((captain): captain is string => {
            if (!captain) return false
            const row = participations.find((p) => p.account.id === captain)
            return !row?.clubFullDeclaredAt
          })

        for (const captain of atFault) {
          em.create(ModerationCase, {
            type: ModerationCaseType.CAPTAIN_ABUSE,
            origin: ModerationCaseOrigin.SYSTEM,
            lobbyId: lobby.id,
            targetAccount: captain,
          })
        }
        await endLobby(
          em,
          lobby,
          atFault.length > 0 ? LobbyState.CANCELLED_BY_CAPTAIN : LobbyState.CANCELLED_NO_FAULT,
          now,
        )
        ended.push(lobby)
      }
      await em.flush()
      return lobbies.length
    })
    await announceEnded(this.events, ended, this.logger)
    return count
  }

  private async openWindow(em: EntityManager, accountId: string, now: Date) {
    const entry = await em.findOne(QueueEntry, { account: accountId, lobby: { $ne: null } })
    if (!entry?.lobby) {
      throw new NotFoundException('no_lobby')
    }
    // The lobby row serializes every answer to it, and the expiry run.
    const lobby = await em.findOneOrFail(
      Lobby,
      { id: entry.lobby.id },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    )
    const deadline = inviteBy(lobby)
    if (lobby.state !== LobbyState.WAITING_INVITE || !deadline || now > deadline) {
      throw new ConflictException('invite_closed')
    }
    const participations = await em.find(LobbyParticipation, { lobby })
    const mine = participations.find((p) => p.account.id === accountId)!
    return { lobby, participations, mine }
  }
}

function captainOf(lobby: Lobby, side: LobbySide): string | undefined {
  return (side === LobbySide.A ? lobby.captainA : lobby.captainB)?.id
}

/** Humans still without the invite; a captain is never one of them. */
function waiting(lobby: Lobby, participations: LobbyParticipation[]): LobbyParticipation[] {
  return participations.filter(
    (p) => !p.inviteReceivedAt && p.account.id !== captainOf(lobby, p.side),
  )
}
