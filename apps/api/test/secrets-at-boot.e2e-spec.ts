import { EntityManager } from '@mikro-orm/postgresql'
import { rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Test } from '@nestjs/testing'

import { AuthModule } from '../src/common/auth/auth.module'
import { HashService } from '../src/common/auth/hash.service'
import { AccountRecoveryService } from '../src/modules/account/account-recovery.service'
import { DiscordLinkService } from '../src/modules/account/discord-link.service'
import { DiscordPresenceService } from '../src/modules/account/discord-presence.service'
import { BotEventsController } from '../src/modules/bot-integration/bot-events.controller'
import { CoordinationState } from '../src/modules/bot-integration/coordination-state'
import { LobbyChannelsService } from '../src/modules/bot-integration/lobby-channels.service'
import { DiscordOAuth, createDiscordOAuth } from '../src/modules/account/discord-oauth'
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

  /*
   * Only the pieces that validate, never the whole AppModule. Booting
   * AppModule connects MikroORM before the failing provider throws, and a
   * compile() that rejects leaves nothing to close — the pool stayed open and
   * Jest exited 1 after every test had passed ("did not exit one second after
   * the test run"). Stubbing the database keeps these tests about the one
   * thing they check.
   */
  const bootRecovery = () =>
    Test.createTestingModule({
      providers: [
        AccountRecoveryService,
        { provide: EntityManager, useValue: {} },
        { provide: HashService, useValue: {} },
      ],
    }).compile()

  const bootAuth = () => Test.createTestingModule({ imports: [AuthModule] }).compile()

  it('refuses to start without EVIDENCE_ENCRYPTION_KEY, because it encrypts account-recovery evidence at rest', async () => {
    delete process.env.EVIDENCE_ENCRYPTION_KEY

    await expect(bootRecovery()).rejects.toThrow(/EVIDENCE_ENCRYPTION_KEY/)
  })

  it('refuses to start when the evidence directory cannot be written — audit of 2026-09-21', async () => {
    // A path under a regular file: mkdir fails the same way on every OS, which
    // is the portable stand-in for the EACCES the production image produced.
    const blocker = join(tmpdir(), `evidence-blocker-${Date.now()}`)
    writeFileSync(blocker, '')
    process.env.EVIDENCE_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64')
    process.env.EVIDENCE_DIR = join(blocker, 'account-recovery')

    try {
      const moduleRef = await bootRecovery()
      await expect(moduleRef.init()).rejects.toThrow(/evidence directory is not writable/)
    } finally {
      rmSync(blocker, { force: true })
    }
  })

  it('refuses to start without JWT_SECRET, because it signs every session', async () => {
    delete process.env.JWT_SECRET

    await expect(bootAuth()).rejects.toThrow(/JWT_SECRET/)
  })

  it('refuses a JWT_SECRET short enough to guess', async () => {
    // 31 characters: not the placeholder, not empty, still brute-forceable.
    process.env.JWT_SECRET = 'a'.repeat(31)

    await expect(bootAuth()).rejects.toThrow(/at least 32 characters/)
  })

  it('refuses a key that decodes to the wrong length, not just a missing one', async () => {
    // 31 bytes: passes a truthiness check, fails AES-256. The shape of
    // mistake a hand-typed value actually produces.
    process.env.EVIDENCE_ENCRYPTION_KEY = Buffer.alloc(31).toString('base64')

    await expect(bootRecovery()).rejects.toThrow(/32 bytes/)
  })
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

/**
 * The Discord link (#149) is the first thing that reads IDENTITY_HMAC_SECRET, so
 * it is the one that must refuse to boot without it: the same failure on first
 * use would surface as a 500 for whoever happens to click "link Discord" first.
 */
describe('the Discord link is validated at boot', () => {
  const ORIGINAL = process.env

  beforeEach(() => {
    process.env = { ...ORIGINAL }
    process.env.EVIDENCE_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64')
    process.env.IDENTITY_HMAC_SECRET = Buffer.alloc(32, 2).toString('base64')
  })

  afterAll(() => {
    process.env = ORIGINAL
  })

  const bootLink = () =>
    Test.createTestingModule({
      providers: [
        DiscordLinkService,
        { provide: EntityManager, useValue: {} },
        { provide: DiscordOAuth, useValue: {} },
      ],
    }).compile()

  it('refuses to start without IDENTITY_HMAC_SECRET, because it keys the ban check', async () => {
    delete process.env.IDENTITY_HMAC_SECRET

    await expect(bootLink()).rejects.toThrow(/IDENTITY_HMAC_SECRET/)
  })

  it('refuses a secret shorter than 32 bytes', async () => {
    process.env.IDENTITY_HMAC_SECRET = Buffer.alloc(16).toString('base64')

    await expect(bootLink()).rejects.toThrow(/32 bytes/)
  })

  it('refuses to start in production without the Discord application', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.DISCORD_CLIENT_ID

    expect(() => createDiscordOAuth()).toThrow(/DISCORD_CLIENT_ID/)
  })

  it('lets a fresh clone boot with no Discord application outside production', () => {
    process.env.NODE_ENV = 'test'
    delete process.env.DISCORD_CLIENT_ID

    expect(() => createDiscordOAuth()).not.toThrow()
  })
})

/**
 * The bot → platform channel (#150) authenticates with WEBHOOK_SECRET and keys
 * the account lookup with IDENTITY_HMAC_SECRET. Either one missing must stop the
 * boot: otherwise every event the bot sends is a 500 it retries, and the account
 * never learns that its owner left the server.
 */
describe('the bot events channel is validated at boot', () => {
  const ORIGINAL = process.env

  beforeEach(() => {
    process.env = { ...ORIGINAL }
    process.env.WEBHOOK_SECRET = 'a-real-looking-webhook-secret'
    process.env.IDENTITY_HMAC_SECRET = Buffer.alloc(32, 2).toString('base64')
  })

  afterAll(() => {
    process.env = ORIGINAL
  })

  const bootPresence = () =>
    Test.createTestingModule({
      providers: [DiscordPresenceService, { provide: EntityManager, useValue: {} }],
    }).compile()

  const bootController = () =>
    Test.createTestingModule({
      controllers: [BotEventsController],
      providers: [
        { provide: DiscordPresenceService, useValue: {} },
        { provide: LobbyChannelsService, useValue: {} },
        { provide: CoordinationState, useValue: {} },
      ],
    }).compile()

  it('refuses to start without WEBHOOK_SECRET, because it authenticates the bot', async () => {
    delete process.env.WEBHOOK_SECRET

    await expect(bootController()).rejects.toThrow(/WEBHOOK_SECRET/)
  })

  it('refuses the placeholder WEBHOOK_SECRET', async () => {
    process.env.WEBHOOK_SECRET = 'changeme'

    await expect(bootController()).rejects.toThrow(/WEBHOOK_SECRET/)
  })

  it('refuses to start without IDENTITY_HMAC_SECRET, because it finds the account', async () => {
    delete process.env.IDENTITY_HMAC_SECRET

    await expect(bootPresence()).rejects.toThrow(/IDENTITY_HMAC_SECRET/)
  })
})
