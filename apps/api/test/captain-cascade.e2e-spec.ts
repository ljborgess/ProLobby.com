import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes } from 'node:crypto'
import request from 'supertest'

import { linkDiscord } from './support/discord'
import { AppModule } from '../src/app.module'
import { CURRENT_EDITION } from '../src/common/domain/game-edition.enum'
import { Platform } from '../src/common/domain/platform.enum'
import { MailSender } from '../src/common/mail/mail.types'
import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME } from '../src/common/security/session-cookie'
import { Account } from '../src/modules/account/account.entity'
import { AccountState } from '../src/modules/account/account.enums'
import { DeclaredClub } from '../src/modules/account/declared-club.entity'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import type { LobbyClosedEvent } from '@prolobby/types'
import { EventDelivery } from '../src/modules/bot-integration/event-delivery.entity'
import { EventDeliveryService } from '../src/modules/bot-integration/event-delivery.service'
import { Archetype, CharacterCategory } from '../src/modules/character/archetype'
import { Character, CharacterState } from '../src/modules/character/character.entity'
import { CaptainOffer, CaptainOfferOutcome } from '../src/modules/lobby/captain-offer.entity'
import { LobbyParticipation, LobbySide } from '../src/modules/lobby/lobby-participation.entity'
import { Lobby, LobbyState } from '../src/modules/lobby/lobby.entity'
import { CaptainCascadeService } from '../src/modules/queue/captain-cascade.service'
import { LobbyConfirmationService } from '../src/modules/queue/lobby-confirmation.service'
import { QueueEntry } from '../src/modules/queue/queue-entry.entity'
import { QueueMatchingService } from '../src/modules/queue/queue-matching.service'
import { QueueRefusal } from '../src/modules/queue/queue-refusal.entity'
import { ReputationEvent } from '../src/modules/ranking/reputation-event.entity'
import { CapturingMailSender } from './support/capturing-mail-sender'

const PASSWORD = 'a-long-enough-password'
const SECOND = 1000

const ARCHETYPE: Record<CharacterCategory, Archetype> = {
  [CharacterCategory.GOALKEEPER]: Archetype.SHOT_STOPPER,
  [CharacterCategory.DEFENDER]: Archetype.BOSS,
  [CharacterCategory.MIDFIELDER]: Archetype.MAESTRO,
  [CharacterCategory.WINGER]: Archetype.SPARK,
  [CharacterCategory.STRIKER]: Archetype.FINISHER,
}

type Player = { accountId: string; cookie: string; name: string; discordId: string }

/** Phase 3, #247: the captain cascade — RF-006, RF-032, RF-033, RF-080. */
describe('captain cascade (#247)', () => {
  let app: INestApplication
  let orm: MikroORM
  let matching: QueueMatchingService
  let confirmation: LobbyConfirmationService
  let cascade: CaptainCascadeService
  let events: EventDeliveryService
  let counter = 0

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  const queued = async (
    name: string,
    category: CharacterCategory,
    reputation: number,
    freeSlots?: number,
  ): Promise<Player> => {
    const email = `cascade-${++counter}@test.local`
    await request(app.getHttpServer()).post('/api/accounts').send({
      email,
      password: PASSWORD,
      birthDate: '1990-05-20',
      securityQuestion: 'Qual o nome do seu primeiro time?',
      securityAnswer: 'São Paulo',
      acceptedTermsVersion: CURRENT_TERMS_VERSION,
    })
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    account.emailVerified = true
    account.state = AccountState.ACTIVE
    const discordId = linkDiscord(account)
    account.reputation = reputation
    const character = em.create(Character, {
      account,
      category,
      archetype: ARCHETYPE[category],
      platform: Platform.PS5,
      edition: CURRENT_EDITION,
      state: CharacterState.VERIFIED,
      verifiedAt: new Date(),
    })
    em.create(QueueEntry, { account, character, category, eloAtEntry: 1000 })
    if (freeSlots !== undefined) {
      em.create(DeclaredClub, { account, freeSlots, clubName: `Clube ${name}` })
    }
    await em.flush()
    const res = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ email, password: PASSWORD })
    return { accountId: account.id, cookie: cookieOf(res), name, discordId }
  }

  /**
   * Eight humans, everyone accepted, the cascade running. The midfielders are
   * the queue's captains (one per side). The keepers split too: one with
   * reputation 90 and a club, one with 60 and a club. The defender with
   * reputation 100 has room for only 1 — not enough for a side of 4.
   */
  const inCascade = async () => {
    const roster = {
      midA: await queued('midA', CharacterCategory.MIDFIELDER, 70, 10),
      midB: await queued('midB', CharacterCategory.MIDFIELDER, 70, 10),
      gk90: await queued('gk90', CharacterCategory.GOALKEEPER, 90, 10),
      gk60: await queued('gk60', CharacterCategory.GOALKEEPER, 60, 10),
      def100: await queued('def100', CharacterCategory.DEFENDER, 100, 1),
      def: await queued('def', CharacterCategory.DEFENDER, 70),
      st1: await queued('st1', CharacterCategory.STRIKER, 70),
      st2: await queued('st2', CharacterCategory.STRIKER, 70),
    }
    expect(await matching.closeMatches()).toBe(1)
    const [lobby] = await orm.em.fork().find(Lobby, { state: LobbyState.WAITING_PLAYERS })
    const t0 = lobby!.createdAt.getTime()
    for (const player of Object.values(roster)) {
      await confirmation.respond(player.accountId, true, new Date(t0 + SECOND))
    }
    return { roster, lobbyId: lobby!.id, startedAt: t0 + SECOND }
  }

  const lobbyOf = (id: string) => orm.em.fork().findOneOrFail(Lobby, { id })
  const sideOf = async (accountId: string) =>
    (await orm.em.fork().findOneOrFail(LobbyParticipation, { account: accountId })).side
  const pending = async (lobbyId: string, side: LobbySide) =>
    orm.em.fork().findOne(CaptainOffer, { lobby: lobbyId, side, outcome: null })
  const at = (ms: number) => new Date(ms)

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder-0123456789'
    process.env.EVIDENCE_ENCRYPTION_KEY ??= randomBytes(32).toString('base64')
    process.env.IDENTITY_HMAC_SECRET ??= randomBytes(32).toString('base64')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailSender)
      .useValue(new CapturingMailSender())
      .compile()
    app = moduleRef.createNestApplication()
    applySecurity(app)
    await app.init()
    orm = moduleRef.get(MikroORM)
    matching = moduleRef.get(QueueMatchingService)
    confirmation = moduleRef.get(LobbyConfirmationService)
    cascade = moduleRef.get(CaptainCascadeService)
    events = moduleRef.get(EventDeliveryService)
  }, 60_000)

  beforeEach(async () => {
    await orm.getSchemaGenerator().refreshDatabase()
  })

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('offers each side to its highest reputation with room for the side', async () => {
    const { roster, lobbyId } = await inCascade()
    const gk90Side = await sideOf(roster.gk90.accountId)
    const otherSide = gk90Side === LobbySide.A ? LobbySide.B : LobbySide.A

    expect((await lobbyOf(lobbyId)).state).toBe(LobbyState.WAITING_CAPTAIN)
    expect((await pending(lobbyId, gk90Side))!.account.id).toBe(roster.gk90.accountId)
    // The 100-reputation defender has room for 1 only: never a candidate.
    const offeredOther = (await pending(lobbyId, otherSide))!.account.id
    expect([roster.midA.accountId, roster.midB.accountId]).toContain(offeredOther)
    expect(offeredOther).not.toBe(roster.def100.accountId)
  })

  it('moves to the next in line on a decline, and remembers "club full"', async () => {
    const { roster, lobbyId, startedAt } = await inCascade()
    const side = await sideOf(roster.gk90.accountId)

    await cascade.respond(roster.gk90.accountId, 'full', at(startedAt + 5 * SECOND))

    const declined = await orm.em
      .fork()
      .findOneOrFail(CaptainOffer, { account: roster.gk90.accountId })
    expect(declined).toMatchObject({ outcome: CaptainOfferOutcome.DECLINED, declaredFull: true })
    const next = (await pending(lobbyId, side))!.account.id
    expect([roster.midA.accountId, roster.midB.accountId]).toContain(next)
  })

  it('moves on when the 30 s run out', async () => {
    const { roster, lobbyId, startedAt } = await inCascade()
    const side = await sideOf(roster.gk90.accountId)

    await cascade.tick(at(startedAt + 29 * SECOND))
    expect((await pending(lobbyId, side))!.account.id).toBe(roster.gk90.accountId)

    await cascade.tick(at(startedAt + 31 * SECOND))
    expect((await pending(lobbyId, side))!.account.id).not.toBe(roster.gk90.accountId)
  })

  it('closes the lobby with both captains: clubs captured, closed_at, lobby.closed queued', async () => {
    const { roster, lobbyId, startedAt } = await inCascade()
    const gk90Side = await sideOf(roster.gk90.accountId)
    const otherSide = gk90Side === LobbySide.A ? LobbySide.B : LobbySide.A
    const other = (await pending(lobbyId, otherSide))!.account.id
    const closeAt = at(startedAt + 10 * SECOND)

    await cascade.respond(roster.gk90.accountId, 'confirm', at(startedAt + 5 * SECOND))
    await cascade.respond(other, 'confirm', closeAt)

    const lobby = await lobbyOf(lobbyId)
    expect(lobby.state).toBe(LobbyState.WAITING_INVITE)
    expect(lobby.closedAt).toEqual(closeAt)
    const gk90Club = gk90Side === LobbySide.A ? lobby.clubA : lobby.clubB
    expect(gk90Club).toBe('Clube gk90')
    const [delivery] = await orm.em.fork().find(EventDelivery, { type: 'lobby.closed' })
    // Discord ids are personal data: never in the clear in the table (RNF-009).
    expect(delivery!.payloadEncrypted.includes(roster.gk90.discordId)).toBe(false)
    const payload = events.payloadOf(delivery!) as LobbyClosedEvent['payload']
    expect(payload.lobbyId).toBe(lobbyId)
    const gk90Payload = gk90Side === LobbySide.A ? payload.sideA : payload.sideB
    expect(gk90Payload.captainDiscordId).toBe(roster.gk90.discordId)
    expect(gk90Payload.clubName).toBe('Clube gk90')
    const all = [...payload.sideA.discordIds, ...payload.sideB.discordIds].sort()
    expect(all).toEqual(
      Object.values(roster)
        .map((player) => player.discordId)
        .sort(),
    )
    for (const player of Object.values(roster)) {
      const mine = (await sideOf(player.accountId)) === LobbySide.A ? payload.sideA : payload.sideB
      expect(mine.discordIds).toContain(player.discordId)
    }
  })

  it('cancels with no fault when a side runs out: everyone searches again, nobody pays', async () => {
    const { roster, lobbyId, startedAt } = await inCascade()
    const before = await orm.em.fork().find(QueueEntry, {})
    const gk60Side = await sideOf(roster.gk60.accountId)
    let now = startedAt
    // Decline everyone the gk60 side is offered, until nobody is left.
    for (
      let offer = await pending(lobbyId, gk60Side);
      offer;
      offer = await pending(lobbyId, gk60Side)
    ) {
      now += SECOND
      await cascade.respond(offer.account.id, 'decline', at(now))
      if ((await lobbyOf(lobbyId)).state !== LobbyState.WAITING_CAPTAIN) break
    }

    const lobby = await lobbyOf(lobbyId)
    expect(lobby.state).toBe(LobbyState.CANCELLED_NO_FAULT)
    const after = await orm.em.fork().find(QueueEntry, {})
    expect(after).toHaveLength(8)
    for (const entry of after) {
      expect(entry.lobby).toBeNull()
      expect(entry.joinedAt).toEqual(before.find((e) => e.id === entry.id)!.joinedAt)
    }
    expect(await orm.em.fork().count(QueueRefusal, {})).toBe(0)
    expect(await orm.em.fork().count(ReputationEvent, {})).toBe(0)
    // The other side's offer was still waiting: it closes with the lobby.
    expect(await orm.em.fork().count(CaptainOffer, { lobby: lobbyId, outcome: null })).toBe(0)
  })

  it('cancels with no fault after 5 min without a pair of captains (RF-080)', async () => {
    const { roster, lobbyId, startedAt } = await inCascade()
    await cascade.respond(roster.gk90.accountId, 'confirm', at(startedAt + 5 * SECOND))

    await cascade.tick(at(startedAt + 5 * 60 * SECOND - SECOND))
    expect((await lobbyOf(lobbyId)).state).toBe(LobbyState.WAITING_CAPTAIN)

    await cascade.tick(at(startedAt + 5 * 60 * SECOND))
    expect((await lobbyOf(lobbyId)).state).toBe(LobbyState.CANCELLED_NO_FAULT)
    expect(await orm.em.fork().count(CaptainOffer, { lobby: lobbyId, outcome: null })).toBe(0)
  })

  it('a captain who withdraws hands the role on, with no penalty (RF-032)', async () => {
    const { roster, lobbyId, startedAt } = await inCascade()
    const side = await sideOf(roster.gk90.accountId)
    await cascade.respond(roster.gk90.accountId, 'confirm', at(startedAt + 5 * SECOND))

    await cascade.withdraw(roster.gk90.accountId, at(startedAt + 8 * SECOND))

    const lobby = await lobbyOf(lobbyId)
    expect(side === LobbySide.A ? lobby.captainA : lobby.captainB).toBeNull()
    expect((await pending(lobbyId, side))!.account.id).not.toBe(roster.gk90.accountId)
    expect(await orm.em.fork().count(ReputationEvent, {})).toBe(0)
  })

  it('skips whoever is captain of another lobby still going (RF-033)', async () => {
    const em = orm.em.fork()
    const busy = await queued('busy', CharacterCategory.WINGER, 99, 10)
    em.create(Lobby, {
      state: LobbyState.WAITING_INVITE,
      captainA: em.getReference(Account, busy.accountId),
    })
    await em.flush()
    await em.nativeDelete(QueueEntry, { account: busy.accountId })
    const { roster, lobbyId } = await inCascade()

    const offered = await orm.em.fork().find(CaptainOffer, { lobby: lobbyId })
    expect(offered.map((offer) => offer.account.id)).not.toContain(busy.accountId)
    expect(offered.map((offer) => offer.account.id)).toContain(roster.gk90.accountId)
  })

  it('answers over HTTP, shows the offer, and refuses after the 30 s', async () => {
    const { roster, lobbyId } = await inCascade()
    const shown = await request(app.getHttpServer())
      .get('/api/queue')
      .set('Cookie', roster.gk90.cookie)
    expect(shown.body.entry.lobby.captainOffer).toMatchObject({ clubName: 'Clube gk90' })

    const res = await request(app.getHttpServer())
      .put('/api/queue/captaincy')
      .set('Cookie', roster.gk90.cookie)
      .send({ answer: 'confirm' })
    expect(res.status).toBe(204)
    const after = await request(app.getHttpServer())
      .get('/api/queue')
      .set('Cookie', roster.gk90.cookie)
    expect(after.body.entry.lobby.isCaptain).toBe(true)

    const otherSide =
      (await sideOf(roster.gk90.accountId)) === LobbySide.A ? LobbySide.B : LobbySide.A
    const late = (await pending(lobbyId, otherSide))!
    await expect(
      cascade.respond(late.account.id, 'confirm', new Date(late.offeredAt.getTime() + 31 * SECOND)),
    ).rejects.toMatchObject({ status: 409 })
  })
})
