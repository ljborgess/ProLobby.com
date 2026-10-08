import { MikroORM } from '@mikro-orm/postgresql'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'

import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'

import { AppModule } from '../src/app.module'
import { applySecurity } from '../src/common/security/security.config'
import { MailSender, TransactionalEmail, type OutgoingEmail } from '../src/common/mail/mail.types'
import { Account } from '../src/modules/account/account.entity'
import { AccountState } from '../src/modules/account/account.enums'
import {
  EmailVerificationService,
  UNVERIFIED_ACCOUNT_TTL_MS,
} from '../src/modules/account/email-verification.service'
import { EmailVerification } from '../src/modules/account/email-verification.entity'

/** Captures what would have been sent, and can be told to fail. */
class CapturingMailSender extends MailSender {
  readonly sent: OutgoingEmail[] = []
  failNext = false

  async send(email: OutgoingEmail): Promise<void> {
    if (this.failNext) {
      this.failNext = false
      throw new Error('provider unavailable')
    }
    this.sent.push(email)
  }

  lastOf(kind: TransactionalEmail): OutgoingEmail | undefined {
    return [...this.sent].reverse().find((email) => email.kind === kind)
  }

  clear(): void {
    this.sent.length = 0
    this.failNext = false
  }
}

const signUpBody = (email: string) => ({
  email,
  password: 'a-long-enough-password',
  birthDate: '1990-05-20',
  securityQuestion: 'Qual o nome do seu primeiro time?',
  securityAnswer: 'São Paulo',
  acceptedTermsVersion: CURRENT_TERMS_VERSION,
})

describe('email verification', () => {
  let app: INestApplication
  let orm: MikroORM
  let mail: CapturingMailSender

  /**
   * Lets the fire-and-forget send settle.
   *
   * Delivery is deliberately not awaited by the request (see
   * EmailVerificationService), so the response can return before the mail
   * reaches the capturing sender. One turn of the event loop is enough here
   * because the test sender does no real I/O.
   */
  const flushMail = () => new Promise((resolve) => setImmediate(resolve))

  const signUp = async (email: string) => {
    const res = await request(app.getHttpServer()).post('/api/accounts').send(signUpBody(email))
    await flushMail()
    return res
  }

  /**
   * The pending verification of a given account.
   *
   * Filtering by account matters: every spec in this file shares one database,
   * so querying "any unused verification" silently picks up another test own
   * row — and the assertion then passes or fails for reasons unrelated to the
   * case at hand.
   */
  const verificationOf = async (email: string): Promise<EmailVerification> => {
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    return em.findOneOrFail(
      EmailVerification,
      { account: account.id },
      { orderBy: { createdAt: 'DESC' } },
    )
  }

  const tokenFrom = (): string => {
    const email = mail.lastOf(TransactionalEmail.VERIFY_ADDRESS)
    return new URL(email?.data.url ?? '', 'http://localhost').searchParams.get('token') ?? ''
  }

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder-0123456789'

    mail = new CapturingMailSender()

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

  beforeEach(() => {
    mail.clear()
  })

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  describe('sign-up sends the link', () => {
    it('emails a verification token to a new address', async () => {
      await signUp('fresh@test.local')

      const sent = mail.lastOf(TransactionalEmail.VERIFY_ADDRESS)
      expect(sent?.to).toBe('fresh@test.local')
      expect(sent?.data.url).toContain('/verify-email?token=')
    })

    it('tells the owner when the address is already taken (RF-020)', async () => {
      await signUp('taken@test.local')
      mail.clear()

      await signUp('taken@test.local')

      // The screen said the same thing both times (RF-070). This email is the
      // only way the real owner ever learns an account already exists — without
      // it, they sign up, get an encouraging message, and wait forever.
      expect(mail.lastOf(TransactionalEmail.ADDRESS_ALREADY_REGISTERED)?.to).toBe(
        'taken@test.local',
      )
      expect(mail.lastOf(TransactionalEmail.VERIFY_ADDRESS)).toBeUndefined()
    })

    it('never stores the token in the clear', async () => {
      await signUp('hashed@test.local')
      const token = tokenFrom()

      const stored = await verificationOf('hashed@test.local')

      // A database leak must not hand over every pending verification —
      // claiming addresses you do not own is exactly what this gate prevents.
      expect(stored.tokenHash).not.toBe(token)
      expect(stored.tokenHash).toHaveLength(64)
    })
  })

  describe('verifying', () => {
    it('activates the account and marks the address verified', async () => {
      await signUp('verify@test.local')

      const res = await request(app.getHttpServer())
        .post('/api/accounts/verifications')
        .send({ token: tokenFrom() })

      expect(res.status).toBe(204)

      const account = await orm.em.fork().findOneOrFail(Account, { email: 'verify@test.local' })
      expect(account.emailVerified).toBe(true)
      expect(account.state).toBe(AccountState.ACTIVE)
    })

    it('accepts a second click on the same link', async () => {
      await signUp('twice@test.local')
      const token = tokenFrom()

      await request(app.getHttpServer()).post('/api/accounts/verifications').send({ token })
      const second = await request(app.getHttpServer())
        .post('/api/accounts/verifications')
        .send({ token })

      // Clicking twice is what people actually do. Answering "invalid" would
      // read like a bug in the product, not like a link already used.
      expect(second.status).toBe(204)
    })

    it('refuses an unknown and an expired token the same way', async () => {
      await signUp('expired@test.local')
      const token = tokenFrom()

      const em = orm.em.fork()
      const verification = await em.findOneOrFail(EmailVerification, {
        id: (await verificationOf('expired@test.local')).id,
      })
      verification.expiresAt = new Date(Date.now() - 1000)
      await em.flush()

      const expired = await request(app.getHttpServer())
        .post('/api/accounts/verifications')
        .send({ token })
      const unknown = await request(app.getHttpServer())
        .post('/api/accounts/verifications')
        .send({ token: 'a'.repeat(43) })

      // Telling "expired" apart from "unknown" would confirm a token had once
      // existed — enough to tell an attacker they guessed a real one.
      expect(expired.status).toBe(400)
      expect(unknown.status).toBe(expired.status)
      expect(unknown.body).toEqual(expired.body)
    })

    it('invalidates the previous token when a new one is issued', async () => {
      await signUp('reissue@test.local')
      const firstToken = tokenFrom()

      const account = await orm.em.fork().findOneOrFail(Account, { email: 'reissue@test.local' })
      await app.get(EmailVerificationService).sendVerification(account)
      const secondToken = tokenFrom()

      expect(secondToken).not.toBe(firstToken)

      const stale = await request(app.getHttpServer())
        .post('/api/accounts/verifications')
        .send({ token: firstToken })
      const current = await request(app.getHttpServer())
        .post('/api/accounts/verifications')
        .send({ token: secondToken })

      // An old link sitting in an inbox must not verify an address later —
      // and must say so (2026-09-23 review): it used to answer 204 "success"
      // here too, which is what this test asserted until the finding.
      expect(stale.status).toBe(400)
      expect(current.status).toBe(204)
      expect(
        (await orm.em.fork().findOneOrFail(Account, { email: 'reissue@test.local' })).emailVerified,
      ).toBe(true)
    })

    it('does not let a banned account escape its punishment by verifying', async () => {
      await signUp('bannedverify@test.local')
      const token = tokenFrom()

      const em = orm.em.fork()
      const account = await em.findOneOrFail(Account, { email: 'bannedverify@test.local' })
      account.state = AccountState.BANNED
      await em.flush()

      await request(app.getHttpServer()).post('/api/accounts/verifications').send({ token })

      const after = await orm.em.fork().findOneOrFail(Account, { email: 'bannedverify@test.local' })
      // The address is verified, but only an UNVERIFIED account is promoted —
      // verification is not a door out of a ban.
      expect(after.emailVerified).toBe(true)
      expect(after.state).toBe(AccountState.BANNED)
    })
  })

  describe('when the email provider is down', () => {
    it('still creates the account instead of failing the sign-up', async () => {
      mail.failNext = true

      const res = await signUp('provider-down@test.local')

      // A delivery failure must not undo a sign-up that already committed.
      // Answering 500 here would leave the person with an account they
      // cannot reach: retrying hits the "already taken" branch, and that
      // branch also depends on sending email.
      expect(res.status).toBe(202)
      await expect(
        orm.em.fork().count(Account, { email: 'provider-down@test.local' }),
      ).resolves.toBe(1)
    })

    it('lets the person ask for a new link afterwards', async () => {
      mail.failNext = true
      await signUp('recovered@test.local')
      mail.clear()

      const res = await request(app.getHttpServer())
        .post('/api/accounts/verifications/resends')
        .send({ email: 'recovered@test.local' })
      await flushMail()

      expect(res.status).toBe(202)

      // This is the only way out of a failed delivery, which is why the
      // resend route had to ship together with swallowing the error.
      const token = tokenFrom()
      expect(token).toBeTruthy()

      const verified = await request(app.getHttpServer())
        .post('/api/accounts/verifications')
        .send({ token })
      expect(verified.status).toBe(204)
    })
  })

  describe('resending', () => {
    it('answers the same for unknown, verified and pending addresses', async () => {
      await signUp('pending@test.local')

      await signUp('alreadydone@test.local')
      await request(app.getHttpServer())
        .post('/api/accounts/verifications')
        .send({ token: tokenFrom() })

      const responses = await Promise.all(
        ['pending@test.local', 'alreadydone@test.local', 'nobody-at-all@test.local'].map((email) =>
          request(app.getHttpServer()).post('/api/accounts/verifications/resends').send({ email }),
        ),
      )

      // Differing here would make this endpoint the oracle the sign-up flow
      // spends all its effort not being (RF-070) — and the easiest one to ask.
      for (const res of responses) {
        expect(res.status).toBe(202)
        expect(res.body).toEqual(responses[0]?.body)
      }
    })

    it('does not email an address that is already verified', async () => {
      await signUp('nospam@test.local')
      await request(app.getHttpServer())
        .post('/api/accounts/verifications')
        .send({ token: tokenFrom() })
      mail.clear()

      await request(app.getHttpServer())
        .post('/api/accounts/verifications/resends')
        .send({ email: 'nospam@test.local' })
      await flushMail()

      // Otherwise anyone could flood a stranger inbox by typing their
      // address into the resend form.
      expect(mail.sent).toHaveLength(0)
    })

    it('invalidates the old link when a new one is issued', async () => {
      await signUp('resent@test.local')
      const first = tokenFrom()

      await request(app.getHttpServer())
        .post('/api/accounts/verifications/resends')
        .send({ email: 'resent@test.local' })
      await flushMail()
      const second = tokenFrom()

      expect(second).not.toBe(first)

      const stale = await request(app.getHttpServer())
        .post('/api/accounts/verifications')
        .send({ token: first })

      // The old link was superseded, not used — 400, not the false 204
      // "success" this test asserted before the 2026-09-23 fix, which
      // verified the response code without checking whether it lied.
      expect(stale.status).toBe(400)

      const account = await orm.em.fork().findOneOrFail(Account, { email: 'resent@test.local' })
      expect(account.emailVerified).toBe(false)

      const current = await request(app.getHttpServer())
        .post('/api/accounts/verifications')
        .send({ token: second })
      expect(current.status).toBe(204)
    })
  })

  describe('unverified accounts expire, freeing the address', () => {
    it('deletes one past the deadline and leaves a recent one alone', async () => {
      await signUp('stale@test.local')
      await signUp('recent@test.local')

      const em = orm.em.fork()
      const stale = await em.findOneOrFail(Account, { email: 'stale@test.local' })
      stale.createdAt = new Date(Date.now() - UNVERIFIED_ACCOUNT_TTL_MS - 1000)
      await em.flush()

      const removed = await app.get(EmailVerificationService).deleteExpiredUnverified()

      expect(removed).toBeGreaterThanOrEqual(1)

      const check = orm.em.fork()
      // Without this, signing up with someone else's address locks it forever,
      // and RF-070 means the real owner never finds out why.
      await expect(check.count(Account, { email: 'stale@test.local' })).resolves.toBe(0)
      await expect(check.count(Account, { email: 'recent@test.local' })).resolves.toBe(1)
    })

    it('never deletes a verified account, however old', async () => {
      await signUp('old-but-verified@test.local')
      await request(app.getHttpServer())
        .post('/api/accounts/verifications')
        .send({ token: tokenFrom() })

      const em = orm.em.fork()
      const account = await em.findOneOrFail(Account, { email: 'old-but-verified@test.local' })
      account.createdAt = new Date(Date.now() - UNVERIFIED_ACCOUNT_TTL_MS - 1000)
      await em.flush()

      await app.get(EmailVerificationService).deleteExpiredUnverified()

      await expect(
        orm.em.fork().count(Account, { email: 'old-but-verified@test.local' }),
      ).resolves.toBe(1)
    })
  })
})
