import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes, randomUUID } from 'node:crypto'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { CURRENT_EDITION } from '../src/common/domain/game-edition.enum'
import { Platform } from '../src/common/domain/platform.enum'
import { MailSender } from '../src/common/mail/mail.types'
import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME } from '../src/common/security/session-cookie'
import { Account } from '../src/modules/account/account.entity'
import { AccountState } from '../src/modules/account/account.enums'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { Archetype, CharacterCategory } from '../src/modules/character/archetype'
import { Character, CharacterState } from '../src/modules/character/character.entity'
import { LobbyParticipation, LobbySide } from '../src/modules/lobby/lobby-participation.entity'
import { Lobby, LobbyState } from '../src/modules/lobby/lobby.entity'
import { EloEvent } from '../src/modules/ranking/elo-event.entity'
import { HISTORY_PAGE } from '../src/modules/ranking/profile.service'
import { EloEventReason } from '../src/modules/ranking/ranking-event.enums'
import { CapturingMailSender } from './support/capturing-mail-sender'

const PASSWORD = 'a-long-enough-password'

/** #337: the public profile and its match history (RF-016, RF-018). */
describe('public profile and match history (#337)', () => {
  let app: INestApplication
  let orm: MikroORM
  let viewer: string
  let counter = 0

  type Seat = { account: Account; character: Character }

  const person = async (nickname?: string, state = AccountState.ACTIVE): Promise<Seat> => {
    const em = orm.em.fork()
    const account = em.create(Account, {
      email: `profile-${++counter}@test.local`,
      passwordHash: 'not-a-login',
      birthDate: new Date('1990-05-20'),
      securityQuestion: 'x',
      securityAnswerHash: 'x',
      emailVerified: true,
      state,
      nickname,
      discordIdHash: randomUUID(),
    })
    const character = em.create(Character, {
      account,
      category: CharacterCategory.MIDFIELDER,
      archetype: Archetype.MAESTRO,
      platform: Platform.PS5,
      edition: CURRENT_EDITION,
      state: CharacterState.VERIFIED,
      verifiedAt: new Date(),
    })
    await em.flush()
    return { account, character }
  }

  /** A match between `a` (side A) and `b` (side B), with the elo it moved for each. */
  const match = async (
    a: Seat,
    b: Seat,
    opts: {
      state?: LobbyState
      score?: [number, number]
      delta?: [number, number]
      reverted?: boolean
      at?: Date
    } = {},
  ): Promise<string> => {
    const {
      state = LobbyState.FINISHED,
      score = [2, 1],
      delta = [10, -10],
      reverted = false,
      at = new Date(),
    } = opts
    const em = orm.em.fork()
    const lobby = em.create(Lobby, {
      state,
      createdAt: at,
      closedAt: at,
      scoreA: score[0],
      scoreB: score[1],
    })
    for (const [seat, side, d] of [
      [a, LobbySide.A, delta[0]],
      [b, LobbySide.B, delta[1]],
    ] as const) {
      em.create(LobbyParticipation, {
        lobby,
        account: seat.account.id,
        character: seat.character.id,
        side,
        category: CharacterCategory.MIDFIELDER,
        eloAtEntry: 1000,
      })
      em.create(EloEvent, {
        character: seat.character.id,
        delta: d,
        reason: EloEventReason.MATCH_RESULT,
        lobbyId: lobby.id,
        revertedAt: reverted ? new Date() : undefined,
      })
    }
    await em.flush()
    return lobby.id
  }

  const get = (path: string, cookie = viewer) =>
    request(app.getHttpServer()).get(`/api/profiles/${path}`).set('Cookie', cookie)

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
  }, 60_000)

  beforeEach(async () => {
    await orm.getSchemaGenerator().refreshDatabase()
    const email = `viewer-${++counter}@test.local`
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
    await em.flush()
    const res = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ email, password: PASSWORD })
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    viewer = cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  })

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('shows nickname, reputation, elo per category and the record, and nothing private', async () => {
    const me = await person('Craque')
    const rival = await person('Rival')
    await match(me, rival, { score: [2, 1], delta: [12, -12] })
    await match(me, rival, { score: [0, 0], delta: [0, 0] })
    await match(rival, me, { score: [3, 0], delta: [8, -8] })
    await match(me, rival, { state: LobbyState.CANCELLED_NO_FAULT })

    const res = await get(me.account.id)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      accountId: me.account.id,
      nickname: 'Craque',
      reputation: 70,
      characters: [{ category: 'midfielder', archetype: 'maestro', elo: 1004 }],
      record: { win: 1, draw: 1, loss: 1 },
    })
  })

  it('lists matches newest first, from this side, with lineup by nickname', async () => {
    const me = await person('Eu')
    const rival = await person()
    const older = await match(me, rival, { at: new Date('2026-11-01'), score: [1, 0] })
    const newer = await match(rival, me, { at: new Date('2026-11-02'), score: [1, 3] })

    const res = await get(`${me.account.id}/matches`)
    expect(res.status).toBe(200)
    expect(res.body.next).toBeNull()
    expect(res.body.items.map((i: { lobbyId: string }) => i.lobbyId)).toEqual([newer, older])
    expect(res.body.items[0]).toMatchObject({
      score: { mine: 3, theirs: 1 },
      result: 'win',
      eloDelta: -10,
      annulled: false,
      lineup: {
        mine: [{ accountId: me.account.id, nickname: 'Eu', category: 'midfielder' }],
        theirs: [{ accountId: rival.account.id, nickname: null, category: 'midfielder' }],
      },
    })
    expect(JSON.stringify(res.body)).not.toMatch(/gamertag|email|discord/i)
  })

  it('shows an annulled match as annulled, with no score, elo or record (RF-044)', async () => {
    const me = await person()
    const rival = await person()
    await match(me, rival, { reverted: true })

    const [item] = (await get(`${me.account.id}/matches`)).body.items
    expect(item).toMatchObject({ annulled: true, score: null, result: null, eloDelta: 0 })
    expect((await get(me.account.id)).body.record).toEqual({ win: 0, draw: 0, loss: 0 })
  })

  it('keeps a match with no score that stands, without a result', async () => {
    const me = await person()
    const rival = await person()
    await match(me, rival, { state: LobbyState.EXPIRED_NO_REPORT })
    const [item] = (await get(`${me.account.id}/matches`)).body.items
    expect(item).toMatchObject({ state: 'expired_no_report', score: null, result: null })
  })

  it('pages 20 at a time and never repeats a match', async () => {
    const me = await person()
    const rival = await person()
    const same = new Date('2026-11-10')
    for (let i = 0; i < HISTORY_PAGE + 3; i++) await match(me, rival, { at: same })

    const first = (await get(`${me.account.id}/matches`)).body
    expect(first.items).toHaveLength(HISTORY_PAGE)
    const second = (await get(`${me.account.id}/matches?before=${first.next}`)).body
    expect(second.items).toHaveLength(3)
    expect(second.next).toBeNull()
    const ids = [...first.items, ...second.items].map((i: { lobbyId: string }) => i.lobbyId)
    expect(new Set(ids).size).toBe(HISTORY_PAGE + 3)
  })

  it('is the same 404 for banned, deleted and unknown, and refuses bad ids', async () => {
    const banned = await person('Fora', AccountState.BANNED)
    const deleted = await person(undefined, AccountState.DELETED)
    for (const id of [banned.account.id, deleted.account.id, randomUUID()]) {
      const res = await get(id)
      expect(res.status).toBe(404)
      expect(res.body.message).toBe('profile_not_found')
    }
    expect((await get('Craque')).status).toBe(400)
    const me = await person()
    expect((await get(`${me.account.id}/matches?before=nope`)).status).toBe(400)
    expect((await get(me.account.id, '')).status).toBe(401)
  })
})
