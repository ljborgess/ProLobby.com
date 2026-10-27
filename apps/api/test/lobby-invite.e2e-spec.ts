import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes } from 'node:crypto'
import request from 'supertest'

import { linkDiscord } from './support/discord'
import { AppModule } from '../src/app.module'
import { EventDelivery } from '../src/modules/bot-integration/event-delivery.entity'
import { EventDeliveryService } from '../src/modules/bot-integration/event-delivery.service'
import { CURRENT_EDITION } from '../src/common/domain/game-edition.enum'
import { Platform } from '../src/common/domain/platform.enum'
import { MailSender } from '../src/common/mail/mail.types'
import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME } from '../src/common/security/session-cookie'
import { Account } from '../src/modules/account/account.entity'
import { AccountState } from '../src/modules/account/account.enums'
import { DeclaredClub } from '../src/modules/account/declared-club.entity'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { Archetype, CharacterCategory } from '../src/modules/character/archetype'
import { Character, CharacterState } from '../src/modules/character/character.entity'
import { CaptainOffer } from '../src/modules/lobby/captain-offer.entity'
import { LobbyParticipation, LobbySide } from '../src/modules/lobby/lobby-participation.entity'
import { Lobby, LobbyState } from '../src/modules/lobby/lobby.entity'
import { ModerationCase } from '../src/modules/moderation/moderation-case.entity'
import { ModerationCaseType } from '../src/modules/moderation/moderation-case.enums'
import { CaptainCascadeService } from '../src/modules/queue/captain-cascade.service'
import { LobbyConfirmationService } from '../src/modules/queue/lobby-confirmation.service'
import { LobbyInviteService } from '../src/modules/queue/lobby-invite.service'
import { QueueEntry } from '../src/modules/queue/queue-entry.entity'
import { QueueMatchingService } from '../src/modules/queue/queue-matching.service'
import { QueueRefusal } from '../src/modules/queue/queue-refusal.entity'
import { ReputationEvent } from '../src/modules/ranking/reputation-event.entity'
import { CapturingMailSender } from './support/capturing-mail-sender'

const PASSWORD = 'a-long-enough-password'
const SECOND = 1000
const MINUTE = 60 * SECOND

const ARCHETYPE: Record<CharacterCategory, Archetype> = {
  [CharacterCategory.GOALKEEPER]: Archetype.SHOT_STOPPER,
  [CharacterCategory.DEFENDER]: Archetype.BOSS,
  [CharacterCategory.MIDFIELDER]: Archetype.MAESTRO,
  [CharacterCategory.WINGER]: Archetype.SPARK,
  [CharacterCategory.STRIKER]: Archetype.FINISHER,
}

type Player = { accountId: string; cookie: string }

/** Phase 3, #248: the 5 min invite window, with and without fault. */
describe('lobby invite window (#248)', () => {
  let app: INestApplication
  let orm: MikroORM
  let matching: QueueMatchingService
  let confirmation: LobbyConfirmationService
  let cascade: CaptainCascadeService
  let invite: LobbyInviteService
  let events: EventDeliveryService
  let counter = 0

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  const queued = async (category: CharacterCategory): Promise<Player> => {
    const email = `invite-${++counter}@test.local`
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
    linkDiscord(account)
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
    em.create(DeclaredClub, { account, freeSlots: 10, clubName: `Clube ${counter}` })
    await em.flush()
    const res = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ email, password: PASSWORD })
    return { accountId: account.id, cookie: cookieOf(res) }
  }

  /** Eight humans, both captains confirmed: the invite window is running. */
  const closedLobby = async () => {
    const players = [
      await queued(CharacterCategory.MIDFIELDER),
      await queued(CharacterCategory.MIDFIELDER),
      await queued(CharacterCategory.GOALKEEPER),
      await queued(CharacterCategory.GOALKEEPER),
      await queued(CharacterCategory.DEFENDER),
      await queued(CharacterCategory.DEFENDER),
      await queued(CharacterCategory.STRIKER),
      await queued(CharacterCategory.STRIKER),
    ]
    expect(await matching.closeMatches()).toBe(1)
    const [created] = await orm.em.fork().find(Lobby, { state: LobbyState.WAITING_PLAYERS })
    const t0 = created!.createdAt.getTime()
    for (const player of players) {
      await confirmation.respond(player.accountId, true, new Date(t0 + SECOND))
    }
    const closedAt = new Date(t0 + 5 * SECOND)
    const offers = await orm.em.fork().find(CaptainOffer, { lobby: created!.id, outcome: null })
    for (const offer of offers) {
      await cascade.respond(offer.account.id, 'confirm', closedAt)
    }
    const lobby = await lobbyOf(created!.id)
    expect(lobby.state).toBe(LobbyState.WAITING_INVITE)

    const rows = await orm.em.fork().find(LobbyParticipation, { lobby })
    const byId = new Map(players.map((p) => [p.accountId, p]))
    const side = (s: LobbySide) => {
      const captain = (s === LobbySide.A ? lobby.captainA : lobby.captainB)!.id
      return {
        captain: byId.get(captain)!,
        others: rows
          .filter((r) => r.side === s && r.account.id !== captain)
          .map((r) => byId.get(r.account.id)!),
      }
    }
    return {
      lobbyId: lobby.id,
      closedAt: closedAt.getTime(),
      a: side(LobbySide.A),
      b: side(LobbySide.B),
    }
  }

  const lobbyOf = (id: string) => orm.em.fork().findOneOrFail(Lobby, { id })
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
    invite = moduleRef.get(LobbyInviteService)
    events = moduleRef.get(EventDeliveryService)
  }, 60_000)

  beforeEach(async () => {
    await orm.getSchemaGenerator().refreshDatabase()
  })

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('goes in_progress once every human got the invite; captains never wait on themselves', async () => {
    const { lobbyId, closedAt, a, b } = await closedLobby()
    const everyone = [...a.others, ...b.others]

    for (const [i, player] of everyone.entries()) {
      expect((await lobbyOf(lobbyId)).state).toBe(LobbyState.WAITING_INVITE)
      await invite.received(player.accountId, at(closedAt + (i + 1) * SECOND))
    }

    expect((await lobbyOf(lobbyId)).state).toBe(LobbyState.IN_PROGRESS)
    expect(await invite.expire(at(closedAt + 10 * MINUTE))).toBe(0)
  })

  it('5 min with someone left out and a silent captain: cancelled_by_captain and an abuse case', async () => {
    const { lobbyId, closedAt, a, b } = await closedLobby()
    const before = await orm.em.fork().find(QueueEntry, {})
    for (const player of [...a.others, ...b.others.slice(1)]) {
      await invite.received(player.accountId, at(closedAt + SECOND))
    }

    expect(await invite.expire(at(closedAt + 5 * MINUTE - SECOND))).toBe(0)
    expect(await invite.expire(at(closedAt + 5 * MINUTE))).toBe(1)

    const lobby = await lobbyOf(lobbyId)
    expect(lobby.state).toBe(LobbyState.CANCELLED_BY_CAPTAIN)
    expect(lobby.endedAt).toEqual(at(closedAt + 5 * MINUTE))
    const cases = await orm.em.fork().find(ModerationCase, { lobbyId })
    expect(cases).toHaveLength(1)
    expect(cases[0]).toMatchObject({ type: ModerationCaseType.CAPTAIN_ABUSE })
    expect(cases[0]!.targetAccount!.id).toBe(b.captain.accountId)

    // Everyone searches again at once, with the time they had and no penalty.
    const after = await orm.em.fork().find(QueueEntry, {})
    expect(after).toHaveLength(8)
    for (const entry of after) {
      expect(entry.lobby).toBeNull()
      expect(entry.joinedAt).toEqual(before.find((e) => e.id === entry.id)!.joinedAt)
    }
    expect(await orm.em.fork().count(QueueRefusal, {})).toBe(0)
    expect(await orm.em.fork().count(ReputationEvent, {})).toBe(0)
    // The bot never reported channels for this lobby: nothing to drop.
    expect(await orm.em.fork().count(EventDelivery, { type: 'lobby.ended' })).toBe(0)
  })

  it('tells the bot to drop the channels of a cancelled lobby at once (#251)', async () => {
    const { lobbyId, closedAt } = await closedLobby()
    const em = orm.em.fork()
    const lobby = await em.findOneOrFail(Lobby, { id: lobbyId })
    lobby.textChannelId = '900000000000000001'
    lobby.voiceAChannelId = '900000000000000002'
    lobby.voiceBChannelId = '900000000000000003'
    await em.flush()

    await invite.expire(at(closedAt + 5 * MINUTE))

    const sent = await orm.em.fork().find(EventDelivery, { type: 'lobby.ended' })
    expect(sent.map((row) => events.payloadOf(row))).toEqual([{ lobbyId }])
  })

  it('a captain who declared the club full: cancelled_no_fault, no case', async () => {
    const { lobbyId, closedAt, a, b } = await closedLobby()
    await invite.declareClubFull(a.captain.accountId, at(closedAt + 30 * SECOND))
    for (const player of [...a.others.slice(1), ...b.others]) {
      await invite.received(player.accountId, at(closedAt + SECOND))
    }

    await invite.expire(at(closedAt + 5 * MINUTE))

    expect((await lobbyOf(lobbyId)).state).toBe(LobbyState.CANCELLED_NO_FAULT)
    expect(await orm.em.fork().count(ModerationCase, { lobbyId })).toBe(0)
    expect(await orm.em.fork().count(QueueEntry, { lobby: null })).toBe(8)

    // The screen says why it is searching again (#252).
    const shown = await request(app.getHttpServer())
      .get('/api/queue')
      .set('Cookie', b.captain.cookie)
    expect(shown.body.entry).toMatchObject({
      lobby: null,
      cancelledLobby: { state: LobbyState.CANCELLED_NO_FAULT },
    })
  })

  it('both sides short, only one captain declared: the silent one alone gets the case', async () => {
    const { lobbyId, closedAt, a, b } = await closedLobby()
    await invite.declareClubFull(a.captain.accountId, at(closedAt + SECOND))

    await invite.expire(at(closedAt + 5 * MINUTE))

    expect((await lobbyOf(lobbyId)).state).toBe(LobbyState.CANCELLED_BY_CAPTAIN)
    const cases = await orm.em.fork().find(ModerationCase, { lobbyId })
    expect(cases.map((c) => c.targetAccount!.id)).toEqual([b.captain.accountId])
  })

  it('answers over HTTP, shows the window, and refuses who is not a captain or comes late', async () => {
    const { a } = await closedLobby()
    const player = a.others[0]!

    const shown = await request(app.getHttpServer()).get('/api/queue').set('Cookie', player.cookie)
    expect(shown.body.entry.lobby).toMatchObject({
      state: LobbyState.WAITING_INVITE,
      inviteReceived: false,
      clubFullDeclared: false,
    })
    expect(shown.body.entry.lobby.inviteBy).toEqual(expect.any(String))
    expect(shown.body.entry.lobby.inviteClubName).toMatch(/^Clube \d+$/)

    const received = await request(app.getHttpServer())
      .put('/api/queue/invite')
      .set('Cookie', player.cookie)
    expect(received.status).toBe(204)
    const after = await request(app.getHttpServer()).get('/api/queue').set('Cookie', player.cookie)
    expect(after.body.entry.lobby.inviteReceived).toBe(true)

    const notCaptain = await request(app.getHttpServer())
      .put('/api/queue/club-full')
      .set('Cookie', player.cookie)
    expect(notCaptain.status).toBe(404)
    const captain = await request(app.getHttpServer())
      .put('/api/queue/club-full')
      .set('Cookie', a.captain.cookie)
    expect(captain.status).toBe(204)

    await expect(
      invite.received(a.others[1]!.accountId, at(Date.now() + 6 * MINUTE)),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('refuses outside a lobby', async () => {
    const loner = await queued(CharacterCategory.WINGER)
    const res = await request(app.getHttpServer())
      .put('/api/queue/invite')
      .set('Cookie', loner.cookie)
    expect(res.status).toBe(404)
  })
})
