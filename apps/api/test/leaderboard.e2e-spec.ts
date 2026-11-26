import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes } from 'node:crypto'
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
import { EloEvent } from '../src/modules/ranking/elo-event.entity'
import { EloEventReason } from '../src/modules/ranking/ranking-event.enums'
import { CapturingMailSender } from './support/capturing-mail-sender'

const PASSWORD = 'a-long-enough-password'
const DAY = 24 * 60 * 60 * 1000

/** #336: five rankings, top 50 active (RF-014, RF-015), never the gamertag. */
describe('ranking by category (#336)', () => {
  let app: INestApplication
  let orm: MikroORM
  let viewer: string
  let counter = 0

  type Player = {
    nickname?: string
    category?: CharacterCategory
    archetype?: Archetype
    /** Elo deltas of match results, with how many days ago each one was. */
    results?: { delta: number; daysAgo: number; reverted?: boolean }[]
    state?: AccountState
  }

  /** A row straight in the database: ranking reads, it never signs in. */
  const player = async ({
    nickname,
    category = CharacterCategory.MIDFIELDER,
    archetype = Archetype.MAESTRO,
    results = [{ delta: 0, daysAgo: 1 }],
    state = AccountState.ACTIVE,
  }: Player): Promise<string> => {
    const em = orm.em.fork()
    const account = em.create(Account, {
      email: `rank-${++counter}@test.local`,
      passwordHash: 'not-a-login',
      birthDate: new Date('1990-05-20'),
      securityQuestion: 'x',
      securityAnswerHash: 'x',
      emailVerified: true,
      state,
      nickname,
    })
    const character = em.create(Character, {
      account,
      category,
      archetype,
      platform: Platform.PS5,
      edition: CURRENT_EDITION,
      state: CharacterState.VERIFIED,
      verifiedAt: new Date(),
    })
    for (const result of results) {
      em.create(EloEvent, {
        character,
        delta: result.delta,
        reason: EloEventReason.MATCH_RESULT,
        createdAt: new Date(Date.now() - result.daysAgo * DAY),
        revertedAt: result.reverted ? new Date() : undefined,
      })
    }
    await em.flush()
    return account.id
  }

  const ranking = (category: string, cookie = viewer) =>
    request(app.getHttpServer()).get(`/api/rankings/${category}`).set('Cookie', cookie)

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

  it('orders by elo, with nickname, archetype and position, and nothing else', async () => {
    const low = await player({ nickname: 'Baixo', results: [{ delta: -20, daysAgo: 2 }] })
    const high = await player({ nickname: 'Alto', results: [{ delta: 30, daysAgo: 2 }] })
    const none = await player({ results: [{ delta: 5, daysAgo: 2 }] })

    const res = await ranking('midfielder')
    expect(res.status).toBe(200)
    expect(res.body.category).toBe('midfielder')
    expect(res.body.rows).toEqual([
      { position: 1, accountId: high, nickname: 'Alto', archetype: 'maestro', elo: 1030 },
      { position: 2, accountId: none, nickname: null, archetype: 'maestro', elo: 1005 },
      { position: 3, accountId: low, nickname: 'Baixo', archetype: 'maestro', elo: 980 },
    ])
  })

  it('lists only the category asked', async () => {
    await player({ category: CharacterCategory.STRIKER, archetype: Archetype.FINISHER })
    const keeper = await player({
      category: CharacterCategory.GOALKEEPER,
      archetype: Archetype.SHOT_STOPPER,
    })
    const rows = (await ranking('goalkeeper')).body.rows
    expect(rows.map((r: { accountId: string }) => r.accountId)).toEqual([keeper])
  })

  it('drops whoever went 30 days without a match, without touching the elo (RF-015)', async () => {
    const away = await player({ nickname: 'Sumido', results: [{ delta: 50, daysAgo: 31 }] })
    expect((await ranking('midfielder')).body.rows).toEqual([])

    // A match in another category brings the account back: RF-015 counts the account.
    const em = orm.em.fork()
    const other = em.create(Character, {
      account: away,
      category: CharacterCategory.STRIKER,
      archetype: Archetype.FINISHER,
      platform: Platform.PS5,
      edition: CURRENT_EDITION,
      state: CharacterState.VERIFIED,
      verifiedAt: new Date(),
    })
    em.create(EloEvent, {
      character: other,
      delta: 0,
      reason: EloEventReason.MATCH_RESULT,
      createdAt: new Date(Date.now() - DAY),
    })
    await em.flush()
    expect((await ranking('midfielder')).body.rows).toMatchObject([{ accountId: away, elo: 1050 }])
  })

  it('ignores an annulled match, for the elo and for being active', async () => {
    await player({ results: [{ delta: 40, daysAgo: 1, reverted: true }] })
    expect((await ranking('midfielder')).body.rows).toEqual([])

    const counted = await player({
      results: [
        { delta: 10, daysAgo: 1 },
        { delta: 40, daysAgo: 1, reverted: true },
      ],
    })
    expect((await ranking('midfielder')).body.rows).toEqual([
      expect.objectContaining({ accountId: counted, elo: 1010 }),
    ])
  })

  it('keeps banned and deleted accounts out', async () => {
    await player({ state: AccountState.BANNED })
    await player({ state: AccountState.DELETED })
    const suspended = await player({ state: AccountState.SUSPENDED })
    const rows = (await ranking('midfielder')).body.rows
    expect(rows.map((r: { accountId: string }) => r.accountId)).toEqual([suspended])
  })

  it('stops at 50', async () => {
    for (let i = 0; i < 51; i++) await player({ results: [{ delta: i, daysAgo: 1 }] })
    const rows = (await ranking('midfielder')).body.rows
    expect(rows).toHaveLength(50)
    expect(rows[0].elo).toBe(1050)
    expect(rows[49]).toMatchObject({ position: 50, elo: 1001 })
  })

  it('refuses an unknown category and asks for a session', async () => {
    expect((await ranking('libero')).status).toBe(400)
    expect((await ranking('midfielder', '')).status).toBe(401)
  })
})
