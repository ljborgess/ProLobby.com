import { Test } from '@nestjs/testing'

import { AppModule } from '../src/app.module'

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
