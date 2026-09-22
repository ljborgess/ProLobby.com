import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes } from 'node:crypto'

import { AppModule } from '../src/app.module'
import { applySecurity } from '../src/common/security/security.config'
import { Account } from '../src/modules/account/account.entity'
import { DiscordLinkState } from '../src/modules/account/discord-link-state.entity'
import {
  EXPIRED_ROW_GRACE_MS,
  ExpiredRowsService,
} from '../src/modules/account/expired-rows.service'
import { FailedSignIn } from '../src/modules/account/failed-sign-in.entity'
import { PasswordReset } from '../src/modules/account/password-reset.entity'

/** Audit of 2026-09-21: these three tables only ever grew. */
describe('ExpiredRowsService', () => {
  let app: INestApplication
  let orm: MikroORM
  let service: ExpiredRowsService

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder'
    process.env.EVIDENCE_ENCRYPTION_KEY ??= randomBytes(32).toString('base64')
    process.env.IDENTITY_HMAC_SECRET ??= randomBytes(32).toString('base64')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    applySecurity(app)
    await app.init()

    orm = moduleRef.get(MikroORM)
    service = moduleRef.get(ExpiredRowsService)
    await orm.getSchemaGenerator().refreshDatabase()
  }, 60_000)

  afterAll(async () => {
    await app.close()
  })

  it('deletes FailedSignIn and PasswordReset only past their use plus the grace day', async () => {
    const now = new Date()
    const old = new Date(now.getTime() - EXPIRED_ROW_GRACE_MS - 60_000)
    const recent = new Date(now.getTime() - 60_000)

    const em = orm.em.fork()
    const account = em.create(Account, {
      email: 'expired-rows@test.local',
      passwordHash: 'hash',
      birthDate: new Date('1990-01-01'),
      securityQuestion: 'question?',
      securityAnswerHash: 'hash',
    })
    em.create(FailedSignIn, { account, createdAt: old })
    em.create(FailedSignIn, { account, createdAt: recent })
    em.create(PasswordReset, { account, tokenHash: 'a'.repeat(64), expiresAt: old })
    em.create(PasswordReset, { account, tokenHash: 'b'.repeat(64), expiresAt: recent })
    await em.flush()

    const purged = await service.purge(now)

    expect(purged.failedSignIns).toBe(1)
    expect(purged.passwordResets).toBe(1)
    const check = orm.em.fork()
    expect(await check.count(FailedSignIn, { account: account.id })).toBe(1)
    expect(await check.count(PasswordReset, { account: account.id })).toBe(1)
  })

  /**
   * Code-review finding of 2026-09-22: DiscordLinkState.codeVerifier is a
   * plaintext secret the entity promises "dies with the row (10 minutes)". It
   * must not share the day-long grace the other two tables get for accuracy —
   * nothing reads this table by how long ago it expired, so there is no
   * accuracy to trade for the extra exposure window.
   */
  it('deletes an expired DiscordLinkState immediately, with no grace period', async () => {
    const now = new Date()
    const justExpired = new Date(now.getTime() - 60_000)
    const notYetExpired = new Date(now.getTime() + 60_000)

    const em = orm.em.fork()
    const account = em.create(Account, {
      email: 'expired-rows-discord@test.local',
      passwordHash: 'hash',
      birthDate: new Date('1990-01-01'),
      securityQuestion: 'question?',
      securityAnswerHash: 'hash',
    })
    em.create(DiscordLinkState, {
      account,
      stateHash: 'c'.repeat(64),
      codeVerifier: 'v',
      expiresAt: justExpired,
    })
    em.create(DiscordLinkState, {
      account,
      stateHash: 'd'.repeat(64),
      codeVerifier: 'v',
      expiresAt: notYetExpired,
    })
    await em.flush()

    const purged = await service.purge(now)

    expect(purged.discordLinkStates).toBe(1)
    const remaining = await orm.em.fork().find(DiscordLinkState, { account: account.id })
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.expiresAt.getTime()).toBe(notYetExpired.getTime())
  })
})
