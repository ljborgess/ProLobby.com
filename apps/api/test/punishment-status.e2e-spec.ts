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
import { ReputationEvent } from '../src/modules/ranking/reputation-event.entity'
import { ReputationEventReason } from '../src/modules/ranking/ranking-event.enums'

const PASSWORD = 'a-long-enough-password'

const signUpBody = (email: string) => ({
  email,
  password: PASSWORD,
  birthDate: '1990-05-20',
  securityQuestion: 'Qual o nome do seu primeiro time?',
  securityAnswer: 'São Paulo',
  acceptedTermsVersion: '2026-09-14',
})

describe('punishment status (gap found in review of #103)', () => {
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

  const statusFor = (cookie: string) =>
    request(app.getHttpServer()).get('/api/accounts/punishment-status').set('Cookie', cookie)

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder'

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

  it('shows an active account it has no punishment', async () => {
    const cookie = await sessionFor('status-active@test.local')

    const res = await statusFor(cookie)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ state: 'active', reason: null })
  })

  it('shows a suspended account its reason and when it ends', async () => {
    const email = 'status-suspended@test.local'
    const cookie = await sessionFor(email, AccountState.SUSPENDED)
    const endsAt = new Date('2026-10-01T00:00:00.000Z')

    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    em.persist(
      em.create(ReputationEvent, {
        account,
        delta: -9,
        reason: ReputationEventReason.ZERO_REPORT,
      }),
    )
    await em.flush()
    await em.nativeUpdate(Account, { id: account.id }, { suspensionEndsAt: endsAt })

    const res = await statusFor(cookie)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      state: 'suspended',
      reason: 'zero_report',
      endsAt: endsAt.toISOString(),
    })
  })

  it('ignores a reverted reputation event when picking the reason', async () => {
    const email = 'status-reverted@test.local'
    const cookie = await sessionFor(email, AccountState.SUSPENDED)

    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    em.persist(
      em.create(ReputationEvent, {
        account,
        delta: -8,
        reason: ReputationEventReason.DISCONNECT,
        revertedAt: new Date(),
      }),
    )
    em.persist(
      em.create(ReputationEvent, {
        account,
        delta: -3,
        reason: ReputationEventReason.ZERO_REPORT,
      }),
    )
    await em.flush()

    const res = await statusFor(cookie)

    // The reverted disconnect is not the story anymore — a rollback erases
    // nothing (it is kept for repeat-offence history), but it must not be
    // read back as the live reason for a punishment that is still in effect.
    expect(res.body.reason).toBe('zero_report')
  })

  it('shows a banned account the moderator decision and the case id', async () => {
    const email = 'status-banned@test.local'
    const cookie = await sessionFor(email, AccountState.BANNED)

    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    const moderationCase = em.create(ModerationCase, {
      type: ModerationCaseType.SCORE_DISPUTE,
      origin: ModerationCaseOrigin.SYSTEM,
      targetAccount: account,
      state: ModerationCaseState.RESOLVED,
      resolvedAt: new Date(),
      decision: 'Print adulterado comprovado em duas partidas — banimento aplicado.',
    })
    em.persist(moderationCase)
    await em.flush()

    const res = await statusFor(cookie)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      state: 'banned',
      reason: 'Print adulterado comprovado em duas partidas — banimento aplicado.',
      caseId: moderationCase.id,
    })
  })

  it('does not leak an open, unresolved case as the ban reason', async () => {
    const email = 'status-openban@test.local'
    const cookie = await sessionFor(email, AccountState.BANNED)

    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    em.persist(
      em.create(ModerationCase, {
        type: ModerationCaseType.SCORE_DISPUTE,
        origin: ModerationCaseOrigin.SYSTEM,
        targetAccount: account,
        state: ModerationCaseState.OPEN,
        decision: 'nota interna do moderador, ainda em análise',
      }),
    )
    await em.flush()

    const res = await statusFor(cookie)

    // Item 17: the moderator's working notes on a case still open are not
    // the same thing as a decision communicated to the person involved.
    expect(res.body.reason).toBeNull()
  })

  it('answers null for a punishment nothing on record explains yet', async () => {
    // The mechanisms that set SUSPENDED and BANNED are not built — this
    // slice only displays. A manually-flipped account with no matching
    // ReputationEvent or resolved ModerationCase must not crash or fabricate
    // a reason.
    const cookie = await sessionFor('status-bare@test.local', AccountState.SUSPENDED)

    const res = await statusFor(cookie)

    expect(res.status).toBe(200)
    expect(res.body.reason).toBeNull()
    // Never set, so MikroORM hydrates it as null, not absent — same as any
    // other unset nullable column.
    expect(res.body.endsAt).toBeNull()
  })

  it('refuses an unverified account, same as any other route without it listed', async () => {
    const cookie = await sessionFor('status-unverified@test.local', AccountState.UNVERIFIED)

    const res = await statusFor(cookie)

    expect(res.status).toBe(403)
  })
})
