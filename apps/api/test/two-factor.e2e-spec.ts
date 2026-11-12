import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes } from 'node:crypto'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { MailSender } from '../src/common/mail/mail.types'
import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME } from '../src/common/security/session-cookie'
import { Account } from '../src/modules/account/account.entity'
import { AccountRole, AccountState } from '../src/modules/account/account.enums'
import { FailedSignIn } from '../src/modules/account/failed-sign-in.entity'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { issueEnrollment } from '../src/modules/account/two-factor-enrollment.cli'
import { AuditAction, AuditEntry } from '../src/modules/moderation/audit-entry.entity'
import { CapturingMailSender } from './support/capturing-mail-sender'
import { codeFor, enroll, withSecondFactor } from './support/two-factor'

const PASSWORD = 'a-long-enough-password'
const PANEL = '/api/moderation/character-verifications'

/** #311, RNF-010: the moderation panel opens only with the second factor. */
describe('second factor for the moderation panel (#311)', () => {
  let app: INestApplication
  let orm: MikroORM
  let counter = 0

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  const signIn = async (email: string) =>
    cookieOf(
      await request(app.getHttpServer()).post('/api/sessions').send({ email, password: PASSWORD }),
    )

  const account = async (role = AccountRole.MODERATOR) => {
    const email = `mfa-${++counter}@test.local`
    await request(app.getHttpServer()).post('/api/accounts').send({
      email,
      password: PASSWORD,
      birthDate: '1990-05-20',
      securityQuestion: 'Qual o nome do seu primeiro time?',
      securityAnswer: 'São Paulo',
      acceptedTermsVersion: CURRENT_TERMS_VERSION,
    })
    const em = orm.em.fork()
    const row = await em.findOneOrFail(Account, { email })
    row.role = role
    row.emailVerified = true
    row.state = AccountState.ACTIVE
    await em.flush()
    return { id: row.id, email, cookie: await signIn(email) }
  }

  const api = () => request(app.getHttpServer())
  const panel = (cookie: string) => api().get(PANEL).set('Cookie', cookie)
  const verify = (cookie: string, code: string) =>
    api().post('/api/sessions/two-factor').set('Cookie', cookie).send({ code })
  const setup = (cookie: string, enrollmentCode: string) =>
    api().post('/api/accounts/me/two-factor/setup').set('Cookie', cookie).send({ enrollmentCode })

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
    await orm.getSchemaGenerator().refreshDatabase()
  }, 60_000)

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('keeps a moderator with only the password out of the panel', async () => {
    const { cookie } = await account()

    const res = await panel(cookie)

    expect(res.status).toBe(403)
    expect(res.body.message).toBe('two_factor_required')
  })

  it('says the factor is required and not set up yet', async () => {
    const { cookie } = await account()

    const res = await api().get('/api/accounts/me/two-factor').set('Cookie', cookie)

    expect(res.body).toEqual({
      required: true,
      enabled: false,
      verified: false,
      recoveryCodesLeft: 0,
    })
  })

  it('will not set up without the enrollment code an admin issued: a password alone enrolls nothing', async () => {
    const { cookie } = await account()

    expect((await setup(cookie, 'abcd-efgh')).status).toBe(400)
  })

  it('refuses an expired enrollment code', async () => {
    const { email, cookie } = await account()
    const code = await enroll(orm, email)
    const em = orm.em.fork()
    const row = await em.findOneOrFail(Account, { email })
    row.twoFactorEnrollmentExpiresAt = new Date(Date.now() - 1_000)
    await em.flush()

    expect((await setup(cookie, code)).status).toBe(400)
  })

  it('opens the panel after setup with a valid code, and hands out 10 recovery codes', async () => {
    const { email, cookie } = await account()

    const upgraded = await withSecondFactor(app, orm, email, cookie)

    expect(upgraded.recoveryCodes).toHaveLength(10)
    expect((await panel(upgraded.cookie)).status).toBe(200)
    const stored = await orm.em.fork().findOneOrFail(Account, { email })
    expect(stored.recoveryCodeHashes).not.toContain(upgraded.recoveryCodes[0])
    expect(stored.twoFactorEnrollmentHash).toBeFalsy()
  })

  it('asks for the code again at the next sign-in, and refuses a wrong one', async () => {
    const { email, cookie } = await account()
    const { secret } = await withSecondFactor(app, orm, email, cookie)
    const fresh = await signIn(email)

    expect((await panel(fresh)).status).toBe(403)
    expect((await verify(fresh, '000000')).status).toBe(401)
    const ok = await verify(fresh, codeFor(secret, new Date(), 1))
    expect(ok.status).toBe(204)
    expect((await panel(cookieOf(ok))).status).toBe(200)
  })

  it('takes a code once: the same digits do not open a second session', async () => {
    const { email, cookie } = await account()
    const { secret } = await withSecondFactor(app, orm, email, cookie)
    const code = codeFor(secret, new Date(), 1)

    expect((await verify(await signIn(email), code)).status).toBe(204)
    expect((await verify(await signIn(email), code)).status).toBe(401)
  })

  it('locks the account after 10 wrong codes in the window, even against the right one', async () => {
    const { id, email, cookie } = await account()
    const { secret } = await withSecondFactor(app, orm, email, cookie)
    const fresh = await signIn(email)
    for (let i = 0; i < 10; i++) await verify(fresh, '000000')

    expect((await verify(fresh, codeFor(secret, new Date(), 1))).status).toBe(429)
    expect(await orm.em.fork().count(FailedSignIn, { account: id })).toBe(10)
  })

  it('takes a recovery code once, and writes its use to the audit log', async () => {
    const { id, email, cookie } = await account()
    const { recoveryCodes } = await withSecondFactor(app, orm, email, cookie)

    expect((await verify(await signIn(email), recoveryCodes[3]!)).status).toBe(204)
    expect((await verify(await signIn(email), recoveryCodes[3]!)).status).toBe(401)
    const entry = await orm.em
      .fork()
      .findOneOrFail(AuditEntry, { action: AuditAction.RECOVERY_CODE_USED, targetAccountId: id })
    expect(entry.after).toEqual({ recoveryCodesLeft: 9 })
  })

  it('does not let a player start a setup', async () => {
    const { email, cookie } = await account(AccountRole.USER)

    expect((await setup(cookie, await enroll(orm, email))).status).toBe(403)
  })

  it('lets an admin issue a new enrollment, wiping the factor and ending the sessions', async () => {
    const admin = await account(AccountRole.ADMIN)
    const target = await account()
    const { cookie } = await withSecondFactor(app, orm, target.email, target.cookie)

    const code = await issueEnrollment(
      orm,
      { email: target.email, operator: admin.email },
      new Date(Date.now() + 1_000),
    )

    expect(code).toMatch(/^[a-z2-7]{4}-[a-z2-7]{4}$/)
    expect((await panel(cookie)).status).toBe(401)
    // Sessions count from whole seconds (iat): sign in again on the next one.
    await new Promise((resolve) => setTimeout(resolve, 1_100))
    const fresh = await signIn(target.email)
    const status = await api().get('/api/accounts/me/two-factor').set('Cookie', fresh)
    expect(status.body.enabled).toBe(false)
    expect((await setup(fresh, code)).status).toBe(200)
    const entry = await orm.em.fork().findOne(AuditEntry, {
      action: AuditAction.TWO_FACTOR_ENROLLMENT,
      targetAccountId: target.id,
    })
    expect(entry?.actorLabel).toBe(`cli:${admin.email}`)
  })

  it('refuses an enrollment by someone who is not an admin, or that wipes their own factor', async () => {
    const moderator = await account()
    const admin = await account(AccountRole.ADMIN)
    await withSecondFactor(app, orm, admin.email, admin.cookie)

    await expect(
      issueEnrollment(orm, { email: moderator.email, operator: moderator.email }),
    ).rejects.toThrow(/not an admin/)
    await expect(
      issueEnrollment(orm, { email: admin.email, operator: admin.email }),
    ).rejects.toThrow(/own second factor/)
  })
})
