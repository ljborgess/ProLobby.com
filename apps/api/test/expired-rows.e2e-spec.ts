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

  it('deletes rows past their use plus the grace day, and keeps everything else', async () => {
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
    em.create(DiscordLinkState, {
      account,
      stateHash: 'c'.repeat(64),
      codeVerifier: 'v',
      expiresAt: old,
    })
    em.create(DiscordLinkState, {
      account,
      stateHash: 'd'.repeat(64),
      codeVerifier: 'v',
      expiresAt: recent,
    })
    await em.flush()

    const purged = await service.purge(now)

    expect(purged).toEqual({ failedSignIns: 1, passwordResets: 1, discordLinkStates: 1 })
    const check = orm.em.fork()
    expect(await check.count(FailedSignIn, {})).toBe(1)
    expect(await check.count(PasswordReset, {})).toBe(1)
    expect(await check.count(DiscordLinkState, {})).toBe(1)
  })
})
