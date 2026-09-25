import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes } from 'node:crypto'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { hashIdentity, readIdentityHmacSecret } from '../src/common/security/identity-hmac'
import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME } from '../src/common/security/session-cookie'
import { Account } from '../src/modules/account/account.entity'
import { AccountState } from '../src/modules/account/account.enums'
import { TermsAcceptance } from '../src/modules/account/terms-acceptance.entity'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { MailSender, TransactionalEmail } from '../src/common/mail/mail.types'
import { VERIFICATION_RESEND_MAX_PER_HOUR } from '../src/modules/account/email-verification.service'
import { CapturingMailSender } from './support/capturing-mail-sender'

const PASSWORD = 'a-long-enough-password'

/** What the logged-in home reads — RF-002, issue #171. */
describe('queue prerequisites (#171)', () => {
  let app: INestApplication
  let orm: MikroORM
  const mail = new CapturingMailSender()
  let counter = 0

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  const account = async (): Promise<{ email: string; cookie: string }> => {
    const email = `prereq-${++counter}@test.local`
    await request(app.getHttpServer()).post('/api/accounts').send({
      email,
      password: PASSWORD,
      birthDate: '1990-05-20',
      securityQuestion: 'Qual o nome do seu primeiro time?',
      securityAnswer: 'São Paulo',
      acceptedTermsVersion: CURRENT_TERMS_VERSION,
    })
    const res = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ email, password: PASSWORD })
    return { email, cookie: cookieOf(res) }
  }

  const patch = async (email: string, change: Partial<Account>): Promise<void> => {
    const em = orm.em.fork()
    const row = await em.findOneOrFail(Account, { email })
    Object.assign(row, change)
    await em.flush()
  }

  const prerequisites = (cookie: string) =>
    request(app.getHttpServer()).get('/api/accounts/me/queue-prerequisites').set('Cookie', cookie)

  const resend = (cookie: string) =>
    request(app.getHttpServer())
      .post('/api/accounts/me/verifications/resends')
      .set('Cookie', cookie)

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder'
    process.env.EVIDENCE_ENCRYPTION_KEY ??= randomBytes(32).toString('base64')
    process.env.IDENTITY_HMAC_SECRET ??= randomBytes(32).toString('base64')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailSender)
      .useValue(mail)
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

  it('reports both pending for a fresh account', async () => {
    const { cookie } = await account()

    const res = await prerequisites(cookie)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      emailVerified: false,
      characterVerified: false,
      discordLinked: false,
      discordPresent: true,
      reputation: 70,
    })
  })

  it('reports the email once it is verified', async () => {
    const { email, cookie } = await account()
    await patch(email, { emailVerified: true, state: AccountState.ACTIVE })

    expect((await prerequisites(cookie)).body).toEqual({
      emailVerified: true,
      characterVerified: false,
      discordLinked: false,
      discordPresent: true,
      reputation: 70,
    })
  })

  it('reports the Discord once it is linked, and never the id or its hash', async () => {
    const { email, cookie } = await account()
    await patch(email, {
      discordIdHash: hashIdentity(readIdentityHmacSecret(), '111111111111111111'),
    })

    const res = await prerequisites(cookie)

    expect(res.body).toEqual({
      emailVerified: false,
      characterVerified: false,
      discordLinked: true,
      discordPresent: true,
      reputation: 70,
    })
    expect(JSON.stringify(res.body)).not.toContain('111111111111111111')
    expect(Object.keys(res.body).sort()).toEqual([
      'characterVerified',
      'discordLinked',
      'discordPresent',
      'emailVerified',
      'reputation',
    ])
  })

  it('reports discordPresent false once the bot has seen the person leave (RF-060, #150)', async () => {
    const { email, cookie } = await account()
    // A different snowflake than the test above: `discordIdHash` is unique,
    // and reusing '111111111111111111' here collided with it in CI, which
    // has a real Postgres to enforce the constraint (2026-09-23).
    await patch(email, {
      discordIdHash: hashIdentity(readIdentityHmacSecret(), '222222222222222222'),
      discordPresent: false,
      reputation: 70,
    })

    const res = await prerequisites(cookie)

    expect(res.body).toEqual({
      emailVerified: false,
      characterVerified: false,
      discordLinked: true,
      discordPresent: false,
      reputation: 70,
    })
  })

  it('reports the character as pending until one is verified (#194)', async () => {
    const { cookie } = await account()

    expect((await prerequisites(cookie)).body.characterVerified).toBe(false)
  })

  describe('refuses without serving a panel', () => {
    it('needs a session', async () => {
      expect(
        (await request(app.getHttpServer()).get('/api/accounts/me/queue-prerequisites')).status,
      ).toBe(401)
    })

    it.each([
      ['suspended', AccountState.SUSPENDED],
      ['banned', AccountState.BANNED],
    ])('refuses a %s account', async (_name, state) => {
      const { email, cookie } = await account()
      await patch(email, { state })

      expect((await prerequisites(cookie)).status).toBe(403)
    })

    it('refuses while the latest terms are not accepted', async () => {
      const { email, cookie } = await account()
      const em = orm.em.fork()
      const row = await em.findOneOrFail(Account, { email })
      await em.nativeDelete(TermsAcceptance, { account: row.id })

      const res = await prerequisites(cookie)

      expect(res.status).toBe(403)
      expect(res.body.message).toBe('terms_acceptance_required')
    })
  })

  describe('resending the verification link', () => {
    it('sends to the account in the session, with no address in the request', async () => {
      const { email, cookie } = await account()
      mail.sent.length = 0

      const res = await resend(cookie)

      expect(res.status).toBe(202)
      expect(mail.sentTo(email, TransactionalEmail.VERIFY_ADDRESS)).toHaveLength(1)
    })

    it('answers the same for an already verified account, and sends nothing', async () => {
      const { email, cookie } = await account()
      await patch(email, { emailVerified: true, state: AccountState.ACTIVE })
      mail.sent.length = 0

      const res = await resend(cookie)

      expect(res.status).toBe(202)
      expect(mail.sent).toHaveLength(0)
    })

    it('stops at three per hour, so a click cannot flood an inbox', async () => {
      const { email, cookie } = await account()
      mail.sent.length = 0

      for (let attempt = 0; attempt < VERIFICATION_RESEND_MAX_PER_HOUR + 2; attempt += 1) {
        expect((await resend(cookie)).status).toBe(202)
      }

      // The sign-up link counts too: it is the first of the hour.
      expect(mail.sentTo(email, TransactionalEmail.VERIFY_ADDRESS).length).toBe(
        VERIFICATION_RESEND_MAX_PER_HOUR - 1,
      )
    })

    it('needs a session', async () => {
      const res = await request(app.getHttpServer()).post('/api/accounts/me/verifications/resends')

      expect(res.status).toBe(401)
    })
  })
})
