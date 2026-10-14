import { LockMode } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { randomInt, randomUUID } from 'node:crypto'

import { Account } from '../account/account.entity'
import { DeclaredClub } from '../account/declared-club.entity'
import { EventDeliveryTargetKind } from '../bot-integration/event-delivery.enums'
import { EventDeliveryService } from '../bot-integration/event-delivery.service'
import { CaptainOffer, CaptainOfferOutcome } from '../lobby/captain-offer.entity'
import { LobbyParticipation, LobbySide } from '../lobby/lobby-participation.entity'
import { Lobby, LobbyState, TERMINAL_LOBBY_STATES } from '../lobby/lobby.entity'
import { endLobby } from './end-lobby'

/** Each candidate answers within this (docs/produto/03-partida/03-lobby.md). */
export const CAPTAIN_ANSWER_MS = 30 * 1000
/** The whole cascade, both sides together (RF-080). */
export const CAPTAIN_CASCADE_MS = 5 * 60 * 1000

export type CaptainAnswer = 'confirm' | 'decline' | 'full'

export const captainAnswerBy = (offer: Pick<CaptainOffer, 'offeredAt'>): Date =>
  new Date(offer.offeredAt.getTime() + CAPTAIN_ANSWER_MS)

/**
 * The captain of each side — #247, RF-006, RF-032, RF-033, RF-080.
 *
 * Starts when everyone accepted (#232) and the lobby enters
 * `waiting_captain`. Each side offers the role to its best candidate: the
 * highest reputation among the humans whose declared club has room for the
 * rest of the side (free slots ≥ humans − 1), a tie drawn by lot. The
 * candidate has 30 s to confirm, decline or say the club filled up; anything
 * but a confirmation moves to the next in line. With both captains confirmed
 * the lobby closes (`waiting_invite`, `closed_at`, the clubs captured) and
 * the bot is told (`lobby.closed`).
 *
 * The cascade never punishes anyone (RF-032): a side that runs out of
 * candidates, or 5 min with no pair of captains, cancels the lobby with no
 * fault and everyone searches again with the time they had.
 */
@Injectable()
export class CaptainCascadeService {
  private readonly logger = new Logger(CaptainCascadeService.name)

  constructor(
    private readonly em: EntityManager,
    private readonly events: EventDeliveryService,
  ) {}

  /** Called in the transaction where the lobby enters `waiting_captain`. */
  async start(em: EntityManager, lobby: Lobby, now: Date): Promise<void> {
    lobby.captainWaitStartedAt = now
    for (const side of [LobbySide.A, LobbySide.B]) {
      if (!(await this.offerNext(em, lobby, side, now))) return
    }
  }

  /** The candidate's answer, within its 30 s. */
  async respond(accountId: string, answer: CaptainAnswer, now: Date = new Date()): Promise<void> {
    const result = await this.em.fork().transactional(async (em) => {
      const pending = await em.findOne(
        CaptainOffer,
        { account: accountId, outcome: null },
        { orderBy: { offeredAt: 'desc' } },
      )
      if (!pending) {
        throw new NotFoundException('no_captaincy_offer')
      }
      const lobby = await this.lockedLobby(em, pending.lobby.id)
      if (lobby.state !== LobbyState.WAITING_CAPTAIN || now > captainAnswerBy(pending)) {
        throw new ConflictException('captaincy_closed')
      }
      pending.answeredAt = now

      if (answer !== 'confirm') {
        pending.outcome = CaptainOfferOutcome.DECLINED
        pending.declaredFull = answer === 'full'
        await this.offerNext(em, lobby, pending.side, now)
        await em.flush()
        return { closed: null, clubInUse: false }
      }

      // RF-033: the account row serializes two lobbies electing the same
      // club; whoever takes it first leaves the other one to the next in line.
      const account = await em.findOneOrFail(
        Account,
        { id: accountId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      const club = await em.findOne(DeclaredClub, { account: accountId })
      if (!club || (await this.captainElsewhere(em, accountId, lobby.id))) {
        pending.outcome = CaptainOfferOutcome.DECLINED
        await this.offerNext(em, lobby, pending.side, now)
        await em.flush()
        // Thrown after the commit: the cascade moving on must stay written.
        return { closed: null, clubInUse: true }
      }

      pending.outcome = CaptainOfferOutcome.CONFIRMED
      if (pending.side === LobbySide.A) {
        lobby.captainA = account
        lobby.clubA = club.clubName
      } else {
        lobby.captainB = account
        lobby.clubB = club.clubName
      }
      const bothConfirmed = Boolean(lobby.captainA && lobby.captainB)
      if (bothConfirmed) {
        lobby.state = LobbyState.WAITING_INVITE
        lobby.closedAt = now
      }
      await em.flush()
      return { closed: bothConfirmed ? lobby.id : null, clubInUse: false }
    })
    if (result.clubInUse) throw new ConflictException('club_in_use')
    if (result.closed) await this.announceClosed(result.closed)
  }

  /**
   * A confirmed captain gives the role up before the other side confirmed
   * (RF-032): no penalty, and the next in line is asked. Once both confirmed,
   * the way out is the invite window (#248), where saying the club filled up
   * is what keeps it from being abuse.
   */
  async withdraw(accountId: string, now: Date = new Date()): Promise<void> {
    await this.em.fork().transactional(async (em) => {
      const offer = await em.findOne(
        CaptainOffer,
        { account: accountId, outcome: CaptainOfferOutcome.CONFIRMED },
        { orderBy: { offeredAt: 'desc' } },
      )
      if (!offer) {
        throw new NotFoundException('not_a_captain')
      }
      const lobby = await this.lockedLobby(em, offer.lobby.id)
      if (lobby.state !== LobbyState.WAITING_CAPTAIN) {
        throw new ConflictException('captaincy_closed')
      }
      offer.outcome = CaptainOfferOutcome.WITHDRAWN
      offer.answeredAt = now
      if (offer.side === LobbySide.A) {
        lobby.captainA = null
        lobby.clubA = undefined
      } else {
        lobby.captainB = null
        lobby.clubB = undefined
      }
      await this.offerNext(em, lobby, offer.side, now)
      await em.flush()
    })
  }

  /**
   * The clock's part, run by the queue job: offers past their 30 s move on,
   * and lobbies past the 5 min cancel with no fault. Returns how many lobbies
   * it touched.
   */
  async tick(now: Date = new Date()): Promise<number> {
    return this.em.fork().transactional(async (em) => {
      const lobbies = await em.find(
        Lobby,
        { state: LobbyState.WAITING_CAPTAIN },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )
      let touched = 0
      for (const lobby of lobbies) {
        const startedAt = lobby.captainWaitStartedAt ?? lobby.createdAt
        if (now.getTime() - startedAt.getTime() >= CAPTAIN_CASCADE_MS) {
          await this.cancelNoFault(em, lobby, now)
          touched += 1
          continue
        }
        const expired = await em.find(CaptainOffer, {
          lobby,
          outcome: null,
          offeredAt: { $lte: new Date(now.getTime() - CAPTAIN_ANSWER_MS) },
        })
        for (const offer of expired) {
          offer.outcome = CaptainOfferOutcome.EXPIRED
          offer.answeredAt = now
          touched += 1
          if (!(await this.offerNext(em, lobby, offer.side, now))) break
        }
      }
      await em.flush()
      return touched
    })
  }

  /**
   * Offers the role to the next candidate of the side, or — with nobody left
   * — cancels the lobby with no fault. Returns whether the lobby goes on.
   */
  private async offerNext(
    em: EntityManager,
    lobby: Lobby,
    side: LobbySide,
    now: Date,
  ): Promise<boolean> {
    const next = await this.nextCandidate(em, lobby, side)
    if (!next) {
      await this.cancelNoFault(em, lobby, now)
      return false
    }
    em.create(CaptainOffer, { lobby, side, account: next, offeredAt: now })
    return true
  }

  /**
   * RF-006: free slots for the other humans of the side. RF-033: not a
   * captain of another lobby still going. Anyone already asked in this lobby
   * is out of the line, whatever they answered.
   */
  private async nextCandidate(
    em: EntityManager,
    lobby: Lobby,
    side: LobbySide,
  ): Promise<string | null> {
    const humans = await em.find(LobbyParticipation, { lobby, side })
    const ids = humans.map((human) => human.account.id)
    const asked = new Set(
      (await em.find(CaptainOffer, { lobby, side })).map((offer) => offer.account.id),
    )
    const clubs = await em.find(DeclaredClub, {
      account: { $in: ids },
      freeSlots: { $gte: humans.length - 1 },
    })
    const accounts = await em.find(Account, { id: { $in: clubs.map((c) => c.account.id) } })

    // Shuffled first, then a stable sort by reputation: equals end up drawn
    // by lot, as the dossier asks.
    const shuffled = accounts
      .map((account) => ({ account, lot: randomInt(1_000_000) }))
      .sort((a, b) => a.lot - b.lot)
      .map(({ account }) => account)
      .sort((a, b) => b.reputation - a.reputation)

    for (const candidate of shuffled) {
      if (asked.has(candidate.id)) continue
      if (await this.captainElsewhere(em, candidate.id, lobby.id)) continue
      return candidate.id
    }
    return null
  }

  private async captainElsewhere(
    em: EntityManager,
    accountId: string,
    lobbyId: string,
  ): Promise<boolean> {
    const busy = await em.count(Lobby, {
      id: { $ne: lobbyId },
      state: { $nin: [...TERMINAL_LOBBY_STATES] },
      $or: [{ captainA: accountId }, { captainB: accountId }],
    })
    return busy > 0
  }

  /** No penalty: no refusal recorded, no reputation event, the time kept. */
  private async cancelNoFault(em: EntityManager, lobby: Lobby, now: Date): Promise<void> {
    await endLobby(em, lobby, LobbyState.CANCELLED_NO_FAULT, now)
    // An offer still waiting dies with the lobby: no row stays "pending" forever.
    await em.nativeUpdate(
      CaptainOffer,
      { lobby, outcome: null },
      { outcome: CaptainOfferOutcome.EXPIRED, answeredAt: now },
    )
  }

  private lockedLobby(em: EntityManager, id: string): Promise<Lobby> {
    return em.findOneOrFail(Lobby, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE })
  }

  /** `lobby.closed` for the bot (#250) — after the commit, never before it. */
  private async announceClosed(lobbyId: string): Promise<void> {
    const em = this.em.fork()
    const lobby = await em.findOneOrFail(Lobby, { id: lobbyId })
    const humans = await em.find(LobbyParticipation, { lobby })
    try {
      await this.events.enqueue(
        {
          id: randomUUID(),
          occurredAt: (lobby.closedAt ?? new Date()).toISOString(),
          type: 'lobby.closed',
          payload: {
            lobbyId,
            sideACaptainAccountId: lobby.captainA!.id,
            sideBCaptainAccountId: lobby.captainB!.id,
            participantAccountIds: humans.map((human) => human.account.id),
          },
        },
        { kind: EventDeliveryTargetKind.LOBBY, id: lobbyId },
      )
    } catch (error) {
      // ponytail: the lobby is closed either way; a lost enqueue means no
      // channels, which the players see at once. An outbox row in the same
      // transaction is the upgrade if it ever happens.
      this.logger.error(
        `could not announce lobby ${lobbyId}`,
        error instanceof Error ? error.stack : undefined,
      )
    }
  }
}
