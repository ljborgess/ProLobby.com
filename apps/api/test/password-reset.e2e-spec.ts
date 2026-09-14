import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { MailSender, TransactionalEmail } from '../src/common/mail/mail.types'
import { applySecurity } from '../src/common/security/security.config'
import { Account } from '../src/modules/account/account.entity'
import { AccountState } from '../src/modules/account/account.enums'
import { hashToken } from '../src/modules/account/account.token'
import { PasswordReset } from '../src/modules/account/password-reset.entity'
import {
  PASSWORD_RESET_MAX_PER_HOUR,
  PASSWORD_RESET_TTL_MS,
  PasswordResetService,
} from '../src/modules/account/password-reset.service'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { CapturingMailSender } from './support/capturing-mail-sender'

const OLD_PASSWORD = 'a-long-enough-password'
const NEW_PASSWORD = 'a-brand-new-long-password'

const signUpBody = (email: string) => ({
  email,
  password: OLD_PASSWORD,
  birthDate: '1990-05-20',
  securityQuestion: 'Qual o nome do seu primeiro time?',
  securityAnswer: 'São Paulo',
  acceptedTermsVersion: CURRENT_TERMS_VERSION,
})

describe('password reset (RF-024)', () => {
  let app: INestApplication
  let orm: MikroORM
  let mail: CapturingMailSender
  let service: PasswordResetService

  const signUp = (email: string) =>
    request(app.getHttpServer()).post('/accounts').send(signUpBody(email))

  const askForReset = (email: string) =>
    request(app.getHttpServer()).post('/accounts/password-resets').send({ email })

  const confirm = (token: string, password = NEW_PASSWORD) =>
    request(app.getHttpServer())
      .post('/accounts/password-resets/confirmations')
      .send({ token, password })

  const signInStatus = async (email: string, password: string): Promise<number> =>
    (await request(app.getHttpServer()).post('/sessions').send({ email, password })).status

  /** Issues a link for the address and returns the token that was emailed. */
  const issueToken = async (email: string): Promise<string> => {
    await service.issue(email)
    return mail.sentTo(email, TransactionalEmail.PASSWORD_RESET).at(-1)?.data.token ?? ''
  }

  /**
   * The reset rows of one account.
   *
   * Filtered by account because every spec in this file shares one database —
   * "any pending reset" silently picks up another test's row.
   */
  const resetsOf = async (email: string): Promise<PasswordReset[]> => {
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    return em.find(PasswordReset, { account: account.id }, { orderBy: { createdAt: 'ASC' } })
  }

  const setExpiry = async (token: string, expiresAt: Date): Promise<void> => {
    const em = orm.em.fork()
    const reset = await em.findOneOrFail(PasswordReset, { tokenHash: hashToken(token) })
    reset.expiresAt = expiresAt
    await em.flush()
  }

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder'

    mail = new CapturingMailSender()

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailSender)
      .useValue(mail)
      .compile()

    app = moduleRef.createNestApplication()
    applySecurity(app)
    await app.init()

    orm = moduleRef.get(MikroORM)
    service = moduleRef.get(PasswordResetService)
    await orm.getSchemaGenerator().refreshDatabase()
  }, 60_000)

  beforeEach(() => {
    mail.clear()
  })

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  describe('asking for a link', () => {
    it('answers the same for an account and for an unknown address (RF-070)', async () => {
      await signUp('ask-known@test.local')

      const known = await askForReset('ask-known@test.local')
      const unknown = await askForReset('ask-nobody@test.local')

      expect(known.status).toBe(202)
      expect(unknown.status).toBe(known.status)
      expect(unknown.body).toEqual(known.body)
    })

    it('emails a link to the owner of the account', async () => {
      await signUp('ask-mail@test.local')

      await askForReset('ask-mail@test.local')
      const sent = await mail.waitFor(TransactionalEmail.PASSWORD_RESET, 'ask-mail@test.local')

      expect(sent.to).toBe('ask-mail@test.local')
      expect(sent.data.token).toBeTruthy()
    })

    it('answers before the email provider does', async () => {
      await signUp('ask-hang@test.local')
      mail.hang = true

      // A provider that never answers must not hold the response: waiting on
      // it would both leak which addresses have accounts, by time, and hang
      // the person's screen.
      const res = await askForReset('ask-hang@test.local')

      expect(res.status).toBe(202)
    })

    it('emails nothing to an unknown address or a deleted account', async () => {
      await signUp('ask-deleted@test.local')
      const em = orm.em.fork()
      const account = await em.findOneOrFail(Account, { email: 'ask-deleted@test.local' })
      account.state = AccountState.DELETED
      await em.flush()
      mail.clear()

      await service.issue('ask-ghost@test.local')
      await service.issue('ask-deleted@test.local')

      expect(mail.sent).toHaveLength(0)
    })

    it('never stores the token in the clear', async () => {
      await signUp('ask-hashed@test.local')
      const token = await issueToken('ask-hashed@test.local')

      const [stored] = await resetsOf('ask-hashed@test.local')

      // A leaked reset token hands over the account; a database leak must not
      // hand over every pending reset.
      expect(stored?.tokenHash).not.toBe(token)
      expect(stored?.tokenHash).toBe(hashToken(token))
    })

    it(`stops emailing one account after ${PASSWORD_RESET_MAX_PER_HOUR} links in an hour`, async () => {
      await signUp('ask-flood@test.local')

      for (let i = 0; i <= PASSWORD_RESET_MAX_PER_HOUR; i++) {
        await service.issue('ask-flood@test.local')
      }

      // Otherwise many machines, each under the per-IP limit, could still
      // flood one stranger's inbox.
      expect(mail.sentTo('ask-flood@test.local', TransactionalEmail.PASSWORD_RESET)).toHaveLength(
        PASSWORD_RESET_MAX_PER_HOUR,
      )
    })
  })

  describe('using the link', () => {
    it('sets the new password and retires the old one', async () => {
      await signUp('use-ok@test.local')
      const token = await issueToken('use-ok@test.local')

      const res = await confirm(token)

      expect(res.status).toBe(204)
      await expect(signInStatus('use-ok@test.local', NEW_PASSWORD)).resolves.toBe(200)
      await expect(signInStatus('use-ok@test.local', OLD_PASSWORD)).resolves.toBe(401)
    })

    it('works once: the second use fails', async () => {
      await signUp('use-twice@test.local')
      const token = await issueToken('use-twice@test.local')

      const first = await confirm(token)
      const second = await confirm(token, 'yet-another-long-password')

      expect(first.status).toBe(204)
      expect(second.status).toBe(400)
      // The second attempt did not change anything.
      await expect(signInStatus('use-twice@test.local', NEW_PASSWORD)).resolves.toBe(200)
    })

    it('refuses a link 31 minutes old and accepts one 29 minutes old', async () => {
      await signUp('use-late@test.local')
      await signUp('use-intime@test.local')
      const late = await issueToken('use-late@test.local')
      const inTime = await issueToken('use-intime@test.local')

      // Issued 31 and 29 minutes ago, against the 30-minute lifetime.
      const minute = 60 * 1000
      await setExpiry(late, new Date(Date.now() + PASSWORD_RESET_TTL_MS - 31 * minute))
      await setExpiry(inTime, new Date(Date.now() + PASSWORD_RESET_TTL_MS - 29 * minute))

      expect((await confirm(late)).status).toBe(400)
      expect((await confirm(inTime)).status).toBe(204)
    })

    it('invalidates the previous link when a new one is asked for', async () => {
      await signUp('use-reissue@test.local')
      const first = await issueToken('use-reissue@test.local')
      const second = await issueToken('use-reissue@test.local')

      expect(second).not.toBe(first)
      expect((await confirm(first)).status).toBe(400)
      expect((await confirm(second)).status).toBe(204)
    })

    it('answers the same for unknown, expired and used links', async () => {
      await signUp('use-same@test.local')
      const expired = await issueToken('use-same@test.local')
      await setExpiry(expired, new Date(Date.now() - 1000))

      await signUp('use-same-used@test.local')
      const used = await issueToken('use-same-used@test.local')
      await confirm(used)

      const responses = await Promise.all([
        confirm('a'.repeat(43)),
        confirm(expired),
        confirm(used, 'another-long-password'),
      ])

      // Telling them apart would confirm a guessed token had once existed.
      for (const res of responses) {
        expect(res.status).toBe(400)
        expect(res.body).toEqual(responses[0]?.body)
      }
    })

    it('lets exactly one of several simultaneous uses win', async () => {
      await signUp('use-race@test.local')
      const token = await issueToken('use-race@test.local')

      // Both requests can pass the first read; only the atomic claim decides.
      const results = await Promise.all([
        confirm(token, 'racing-password-number-1'),
        confirm(token, 'racing-password-number-2'),
        confirm(token, 'racing-password-number-3'),
      ])

      const statuses = results.map((res) => res.status).sort()
      expect(statuses).toEqual([204, 400, 400])
    })

    it('rejects a short password without spending the link', async () => {
      await signUp('use-short@test.local')
      const token = await issueToken('use-short@test.local')

      const short = await confirm(token, 'short')
      const valid = await confirm(token)

      expect(short.status).toBe(400)
      expect(valid.status).toBe(204)
    })

    it('retires every other pending link once a reset completes', async () => {
      await signUp('use-others@test.local')
      const used = await issueToken('use-others@test.local')

      // Another live link for the same account, as a race between two
      // requests could leave behind.
      const em = orm.em.fork()
      const account = await em.findOneOrFail(Account, { email: 'use-others@test.local' })
      const leftover = 'leftover-token-that-was-never-emailed-1234567'
      em.persist(
        em.create(PasswordReset, {
          account,
          tokenHash: hashToken(leftover),
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        }),
      )
      await em.flush()

      expect((await confirm(used)).status).toBe(204)

      // An older link surfacing later must not undo the reset.
      expect((await confirm(leftover, 'an-attacker-long-password')).status).toBe(400)
    })
  })
})
