import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME } from '../src/common/security/session-cookie'
import { Account } from '../src/modules/account/account.entity'
import { AccountState } from '../src/modules/account/account.enums'
import { ModerationCase } from '../src/modules/moderation/moderation-case.entity'
import {
  ModerationCaseOrigin,
  ModerationCaseState,
  ModerationCaseType,
} from '../src/modules/moderation/moderation-case.enums'

const PASSWORD = 'a-long-enough-password'
const APPEAL_MESSAGE = 'O print que causou o banimento era de outra conta, não da minha.'

const signUpBody = (email: string) => ({
  email,
  password: PASSWORD,
  birthDate: '1990-05-20',
  securityQuestion: 'Qual o nome do seu primeiro time?',
  securityAnswer: 'São Paulo',
  acceptedTermsVersion: '2026-09-14',
})

describe('punishment appeal (RF-081, RF-037)', () => {
  let app: INestApplication
  let orm: MikroORM

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  /** Signs up, puts the account in the given state, signs in, returns the cookie. */
  const sessionFor = async (email: string, state = AccountState.ACTIVE): Promise<string> => {
    await request(app.getHttpServer()).post('/api/accounts').send(signUpBody(email))
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    account.state = state
    await em.flush()
    const res = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ email, password: PASSWORD })
    return cookieOf(res)
  }

  /** A resolved case, as if a moderator had already banned the account for it. */
  const givePunishmentCase = async (email: string): Promise<string> => {
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    const punishment = em.create(ModerationCase, {
      type: ModerationCaseType.SCORE_DISPUTE,
      origin: ModerationCaseOrigin.SYSTEM,
      targetAccount: account,
      state: ModerationCaseState.RESOLVED,
      resolvedAt: new Date(),
      decision: 'Print adulterado comprovado — banimento aplicado.',
    })
    em.persist(punishment)
    await em.flush()
    return punishment.id
  }

  /** A moderator deciding a case — what closes an appeal in phase 5. */
  const resolveCase = async (caseId: string, decision: string): Promise<void> => {
    const em = orm.em.fork()
    const moderationCase = await em.findOneOrFail(ModerationCase, { id: caseId })
    moderationCase.state = ModerationCaseState.RESOLVED
    moderationCase.resolvedAt = new Date()
    moderationCase.decision = decision
    await em.flush()
  }

  const appeal = (cookie: string, message = APPEAL_MESSAGE) =>
    request(app.getHttpServer())
      .post('/api/accounts/me/punishment/appeals')
      .set('Cookie', cookie)
      .send({ message })

  const appealsFor = async (email: string): Promise<ModerationCase[]> => {
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    return em.find(
      ModerationCase,
      { targetAccount: account.id, type: ModerationCaseType.PUNISHMENT_APPEAL },
      { populate: ['appealsCase'] },
    )
  }

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder-0123456789'

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()

    app = moduleRef.createNestApplication()
    applySecurity(app)
    await app.init()

    orm = moduleRef.get(MikroORM)
    await orm.getSchemaGenerator().refreshDatabase()
  }, 60_000)

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('opens an appeal linked to the punishment case, with the message', async () => {
    const email = 'appeal-open@test.local'
    const cookie = await sessionFor(email, AccountState.BANNED)
    const punishmentCaseId = await givePunishmentCase(email)

    const res = await appeal(cookie)

    expect(res.status).toBe(201)
    expect(res.body.caseId).toBeTruthy()

    const [opened] = await appealsFor(email)
    expect(opened?.id).toBe(res.body.caseId)
    expect(opened?.origin).toBe(ModerationCaseOrigin.USER)
    expect(opened?.appealMessage).toBe(APPEAL_MESSAGE)
    expect(opened?.appealsCase?.id).toBe(punishmentCaseId)
  })

  it('refuses a second appeal on the same punishment (RF-037)', async () => {
    const email = 'appeal-second@test.local'
    const cookie = await sessionFor(email, AccountState.BANNED)
    await givePunishmentCase(email)

    const first = await appeal(cookie)
    const second = await appeal(cookie, 'Segunda tentativa, motivo diferente desta vez.')

    expect(first.status).toBe(201)
    expect(second.status).toBe(409)
    expect(await appealsFor(email)).toHaveLength(1)
  })

  it('refuses a second appeal even after a moderator resolved the first (RF-037)', async () => {
    const email = 'appeal-chain@test.local'
    const cookie = await sessionFor(email, AccountState.BANNED)
    const punishmentCaseId = await givePunishmentCase(email)

    const first = await appeal(cookie)
    expect(first.status).toBe(201)

    // The moderator decides the appeal. That resolution makes the *appeal*
    // the account's most recently resolved case — and an appeal is not a
    // punishment, so it must never become the target of another one.
    await resolveCase(first.body.caseId, 'Recurso negado — o print confere.')

    const second = await appeal(cookie, 'Terceira via: quero que olhem de novo.')

    expect(second.status).toBe(409)
    const filed = await appealsFor(email)
    expect(filed).toHaveLength(1)
    expect(filed[0]?.appealsCase?.id).toBe(punishmentCaseId)
  })

  it('keeps showing the ban reason after the appeal is resolved', async () => {
    const email = 'appeal-reason@test.local'
    const cookie = await sessionFor(email, AccountState.BANNED)
    await givePunishmentCase(email)

    const filed = await appeal(cookie)
    await resolveCase(filed.body.caseId, 'Recurso negado — o print confere.')

    const status = await request(app.getHttpServer())
      .get('/api/accounts/me/punishment')
      .set('Cookie', cookie)

    // The decision shown to a banned person is what got them banned, not the
    // note a moderator left when turning their appeal down.
    expect(status.body.reason).toBe('Print adulterado comprovado — banimento aplicado.')
  })

  it('lets two simultaneous appeals still leave exactly one filed', async () => {
    const email = 'appeal-race@test.local'
    const cookie = await sessionFor(email, AccountState.BANNED)
    await givePunishmentCase(email)

    const results = await Promise.all([appeal(cookie), appeal(cookie)])

    const statuses = results.map((res) => res.status).sort()
    expect(statuses).toEqual([201, 409])
    expect(await appealsFor(email)).toHaveLength(1)
  })

  it('refuses an appeal with no punishment case on record', async () => {
    const email = 'appeal-nopunishment@test.local'
    const cookie = await sessionFor(email, AccountState.BANNED)

    const res = await appeal(cookie)

    expect(res.status).toBe(400)
    expect(await appealsFor(email)).toHaveLength(0)
  })

  it('rejects a message that is too short to act on', async () => {
    const email = 'appeal-short@test.local'
    const cookie = await sessionFor(email, AccountState.BANNED)
    await givePunishmentCase(email)

    const res = await appeal(cookie, 'não concordo')

    expect(res.status).toBe(400)
    expect(await appealsFor(email)).toHaveLength(0)
  })

  it('does not let an active account reach the route', async () => {
    const email = 'appeal-active@test.local'
    const cookie = await sessionFor(email, AccountState.ACTIVE)

    const res = await appeal(cookie)

    expect(res.status).toBe(403)
  })
})
