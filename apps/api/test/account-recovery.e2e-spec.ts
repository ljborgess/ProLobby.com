import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { applySecurity } from '../src/common/security/security.config'
import { AccountRecoveryService } from '../src/modules/account/account-recovery.service'
import { Account } from '../src/modules/account/account.entity'
import { AccountState } from '../src/modules/account/account.enums'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { ModerationCase } from '../src/modules/moderation/moderation-case.entity'
import {
  ModerationCaseOrigin,
  ModerationCaseType,
} from '../src/modules/moderation/moderation-case.enums'

const PASSWORD = 'a-long-enough-password'
const SECURITY_QUESTION = 'Qual o nome do seu primeiro time?'
const SECURITY_ANSWER = 'São Paulo'

// A real, minimal JPG — just the SOI/EOI markers plus a JFIF-ish body. Small
// enough to keep the test fast, real enough to pass the magic-byte check.
const JPG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xd9])
const EVIDENCE_DIR = join(process.cwd(), 'uploads', 'account-recovery')

const signUpBody = (email: string) => ({
  email,
  password: PASSWORD,
  birthDate: '1990-05-20',
  securityQuestion: SECURITY_QUESTION,
  securityAnswer: SECURITY_ANSWER,
  acceptedTermsVersion: CURRENT_TERMS_VERSION,
})

describe('account recovery (RF-025)', () => {
  let app: INestApplication
  let orm: MikroORM
  let service: AccountRecoveryService

  const signUp = (email: string) =>
    request(app.getHttpServer()).post('/accounts').send(signUpBody(email))

  const requestRecovery = (email: string, securityAnswer: string, evidence: Buffer | null) => {
    const req = request(app.getHttpServer())
      .post('/accounts/recovery-cases')
      .field('email', email)
      .field('securityAnswer', securityAnswer)

    return evidence ? req.attach('evidence', evidence, 'print.jpg') : req
  }

  const caseFor = async (email: string): Promise<ModerationCase | null> => {
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    return em.findOne(ModerationCase, {
      targetAccount: account.id,
      type: ModerationCaseType.ACCOUNT_RECOVERY,
    })
  }

  /**
   * Waits for a case to appear — opening one is fire-and-forget by design
   * (AccountRecoveryService.request), so the HTTP request returns before the
   * lookup, the comparison and the case insert ever run.
   */
  const waitForCase = async (email: string, timeoutMs = 2000): Promise<ModerationCase> => {
    const deadline = Date.now() + timeoutMs
    for (;;) {
      const found = await caseFor(email)
      if (found) {
        return found
      }
      if (Date.now() > deadline) {
        throw new Error(`no account_recovery case for ${email} within ${timeoutMs} ms`)
      }
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder'

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()

    app = moduleRef.createNestApplication()
    applySecurity(app)
    await app.init()

    orm = moduleRef.get(MikroORM)
    service = moduleRef.get(AccountRecoveryService)
    await orm.getSchemaGenerator().refreshDatabase()
  }, 60_000)

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await rm(EVIDENCE_DIR, { recursive: true, force: true })
    await app.close()
  })

  it('answers the same for an account and for an unknown address (RF-070)', async () => {
    await signUp('recover-known@test.local')

    const known = await requestRecovery('recover-known@test.local', SECURITY_ANSWER, JPG_BYTES)
    const unknown = await requestRecovery('recover-nobody@test.local', SECURITY_ANSWER, JPG_BYTES)

    expect(known.status).toBe(202)
    expect(unknown.status).toBe(known.status)
    expect(unknown.body).toEqual(known.body)
  })

  it('answers the same whether the security answer is right or wrong', async () => {
    await signUp('recover-wrong@test.local')

    const right = await requestRecovery('recover-wrong@test.local', SECURITY_ANSWER, JPG_BYTES)
    const wrong = await requestRecovery('recover-wrong@test.local', 'not the answer', JPG_BYTES)

    expect(wrong.status).toBe(right.status)
    expect(wrong.body).toEqual(right.body)
  })

  it('opens a case with the right answer and the evidence attached', async () => {
    await signUp('recover-open@test.local')

    const res = await requestRecovery('recover-open@test.local', SECURITY_ANSWER, JPG_BYTES)
    expect(res.status).toBe(202)

    const opened = await waitForCase('recover-open@test.local')
    expect(opened.type).toBe(ModerationCaseType.ACCOUNT_RECOVERY)
    expect(opened.origin).toBe(ModerationCaseOrigin.USER)
    expect(opened.evidencePath).toBeTruthy()

    const stored = await readFile(opened.evidencePath!)
    expect(stored.equals(JPG_BYTES)).toBe(true)
  })

  it('opens nothing when the answer is wrong — one factor is not enough (RF-025)', async () => {
    await signUp('recover-onefactor@test.local')

    await service.open('recover-onefactor@test.local', 'not the answer', JPG_BYTES, 'jpg')

    // No polling here: a case that will never be created has no event to
    // wait for, so the assertion just checks the state directly.
    expect(await caseFor('recover-onefactor@test.local')).toBeNull()
  })

  it('rejects a request with no evidence file', async () => {
    await signUp('recover-nofile@test.local')

    const res = await requestRecovery('recover-nofile@test.local', SECURITY_ANSWER, null)

    expect(res.status).toBe(400)
    expect(await caseFor('recover-nofile@test.local')).toBeNull()
  })

  it('rejects a file that is not really an image, whatever its name claims (item 16)', async () => {
    await signUp('recover-fakefile@test.local')

    const notAnImage = Buffer.from('<?php system($_GET["c"]); ?>')
    const res = await request(app.getHttpServer())
      .post('/accounts/recovery-cases')
      .field('email', 'recover-fakefile@test.local')
      .field('securityAnswer', SECURITY_ANSWER)
      .attach('evidence', notAnImage, 'print.jpg')

    expect(res.status).toBe(400)
    expect(await caseFor('recover-fakefile@test.local')).toBeNull()
  })

  it('opens nothing for a deleted account, with the same generic answer', async () => {
    await signUp('recover-deleted@test.local')
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email: 'recover-deleted@test.local' })
    account.state = AccountState.DELETED
    await em.flush()

    const res = await requestRecovery('recover-deleted@test.local', SECURITY_ANSWER, JPG_BYTES)
    await service.open('recover-deleted@test.local', SECURITY_ANSWER, JPG_BYTES, 'jpg')

    expect(res.status).toBe(202)
    expect(await caseFor('recover-deleted@test.local')).toBeNull()
  })
})
