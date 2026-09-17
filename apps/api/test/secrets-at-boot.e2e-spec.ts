import { Test } from '@nestjs/testing'

import { AppModule } from '../src/app.module'
import { ConsoleMailSender } from '../src/common/mail/console-mail.sender'
import { MailModule } from '../src/common/mail/mail.module'
import { MailSender } from '../src/common/mail/mail.types'
import { ResendMailSender } from '../src/common/mail/resend-mail.sender'

/**
 * Every secret the application cannot work without must stop the boot when it
 * is missing — never surface as a failed request in production.
 *
 * EVIDENCE_ENCRYPTION_KEY is the one that made this spec necessary. It used to
 * be read inside `AccountRecoveryService.saveEvidence`, on the request path,
 * and `request()` is fire-and-forget: the throw became a log line while the
 * person received the 202 that says their recovery was accepted. Booting
 * without the key silently lost every account recovery, and item 5 of the
 * security checklist stopped existing with nothing failing anywhere.
 */
describe('secrets are validated at boot', () => {
  const ORIGINAL = process.env

  beforeEach(() => {
    process.env = { ...ORIGINAL }
  })

  afterAll(() => {
    process.env = ORIGINAL
  })

  const boot = () => Test.createTestingModule({ imports: [AppModule] }).compile()

  it.each([
    ['EVIDENCE_ENCRYPTION_KEY', 'it encrypts account-recovery evidence at rest'],
    ['JWT_SECRET', 'it signs every session'],
  ])(
    'refuses to start without %s, because %s',
    async (variable) => {
      delete process.env[variable]

      await expect(boot()).rejects.toThrow(new RegExp(variable))
    },
    60_000,
  )

  it('refuses a key that decodes to the wrong length, not just a missing one', async () => {
    // 31 bytes: passes a truthiness check, fails AES-256. The shape of
    // mistake a hand-typed value actually produces.
    process.env.EVIDENCE_ENCRYPTION_KEY = Buffer.alloc(31).toString('base64')

    await expect(boot()).rejects.toThrow(/32 bytes/)
  }, 60_000)
})

/**
 * The mail sender is chosen at boot, and the choice is a safety property: a
 * production process that starts believing it can send email, when it cannot,
 * turns every sign-up into an account whose verification link never arrives —
 * indistinguishable, from the outside, from a sign-up that is simply broken.
 */
describe('the mail sender is chosen at boot', () => {
  const ORIGINAL = process.env

  beforeEach(() => {
    process.env = { ...ORIGINAL }
  })

  afterAll(() => {
    process.env = ORIGINAL
  })

  const bootMail = () => Test.createTestingModule({ imports: [MailModule] }).compile()

  it('refuses to start in production with no provider configured', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.RESEND_API_KEY

    await expect(bootMail()).rejects.toThrow(/RESEND_API_KEY is required in production/)
  }, 60_000)

  it('uses Resend when configured, in any environment', async () => {
    process.env.RESEND_API_KEY = 'test-key-not-a-real-one'
    process.env.MAIL_FROM = 'ProLobby <nao-responda@example.test>'

    const moduleRef = await bootMail()

    expect(moduleRef.get(MailSender)).toBeInstanceOf(ResendMailSender)
  }, 60_000)

  it('refuses a Resend key with no sender address, instead of sending from nowhere', async () => {
    process.env.RESEND_API_KEY = 'test-key-not-a-real-one'
    delete process.env.MAIL_FROM

    await expect(bootMail()).rejects.toThrow(/MAIL_FROM is required/)
  }, 60_000)

  it('falls back to the console sender outside production, so a fresh clone runs', async () => {
    process.env.NODE_ENV = 'test'
    delete process.env.RESEND_API_KEY

    const moduleRef = await bootMail()

    expect(moduleRef.get(MailSender)).toBeInstanceOf(ConsoleMailSender)
  }, 60_000)
})
