import { randomBytes } from 'node:crypto'
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { applySecurity } from '../src/common/security/security.config'
import {
  decryptAtRest,
  readEvidenceEncryptionKey,
} from '../src/common/security/evidence-encryption'
import {
  ACCOUNT_RECOVERY_MAX_PER_DAY,
  AccountRecoveryService,
} from '../src/modules/account/account-recovery.service'
import { Account } from '../src/modules/account/account.entity'
import { AccountState } from '../src/modules/account/account.enums'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { ModerationCase } from '../src/modules/moderation/moderation-case.entity'
import {
  ModerationCaseOrigin,
  ModerationCaseState,
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

  const casesFor = async (email: string): Promise<ModerationCase[]> => {
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    return em.find(ModerationCase, {
      targetAccount: account.id,
      type: ModerationCaseType.ACCOUNT_RECOVERY,
    })
  }

  const caseFor = async (email: string): Promise<ModerationCase | null> =>
    (await casesFor(email)).at(0) ?? null

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
    process.env.EVIDENCE_ENCRYPTION_KEY ??= randomBytes(32).toString('base64')

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

  it('opens a case with the right answer and the evidence attached, encrypted at rest', async () => {
    await signUp('recover-open@test.local')

    const res = await requestRecovery('recover-open@test.local', SECURITY_ANSWER, JPG_BYTES)
    expect(res.status).toBe(202)

    const opened = await waitForCase('recover-open@test.local')
    expect(opened.type).toBe(ModerationCaseType.ACCOUNT_RECOVERY)
    expect(opened.origin).toBe(ModerationCaseOrigin.USER)
    expect(opened.evidencePath).toBeTruthy()

    const storedRaw = await readFile(opened.evidencePath!)
    // Item 5 / RNF-009: what is on disk must not be the plaintext image —
    // otherwise reading the file is indistinguishable from not encrypting it.
    expect(storedRaw.includes(JPG_BYTES)).toBe(false)

    const decrypted = decryptAtRest(readEvidenceEncryptionKey(), storedRaw)
    expect(decrypted.equals(JPG_BYTES)).toBe(true)
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

  it('rejects a file over the 10 MB ceiling without a 500 (item 16)', async () => {
    await signUp('recover-toobig@test.local')

    const oversized = Buffer.concat([JPG_BYTES.subarray(0, 3), Buffer.alloc(11 * 1024 * 1024)])
    const res = await request(app.getHttpServer())
      .post('/accounts/recovery-cases')
      .field('email', 'recover-toobig@test.local')
      .field('securityAnswer', SECURITY_ANSWER)
      .attach('evidence', oversized, 'print.jpg')

    expect(res.status).toBe(413)
    expect(await caseFor('recover-toobig@test.local')).toBeNull()
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

  it('opens nothing for a banned account — there is no access left to hand back', async () => {
    await signUp('recover-banned@test.local')
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email: 'recover-banned@test.local' })
    account.state = AccountState.BANNED
    await em.flush()

    await service.open('recover-banned@test.local', SECURITY_ANSWER, JPG_BYTES, 'jpg')

    expect(await caseFor('recover-banned@test.local')).toBeNull()
  })

  it('does not open a second case while one is still open', async () => {
    await signUp('recover-dedup@test.local')

    await service.open('recover-dedup@test.local', SECURITY_ANSWER, JPG_BYTES, 'jpg')
    await service.open('recover-dedup@test.local', SECURITY_ANSWER, JPG_BYTES, 'jpg')

    const cases = await casesFor('recover-dedup@test.local')
    expect(cases).toHaveLength(1)
  })

  it('lets two simultaneous correct requests still leave exactly one open case', async () => {
    await signUp('recover-dedup-race@test.local')

    await Promise.all([
      requestRecovery('recover-dedup-race@test.local', SECURITY_ANSWER, JPG_BYTES),
      requestRecovery('recover-dedup-race@test.local', SECURITY_ANSWER, JPG_BYTES),
    ])

    await waitForCase('recover-dedup-race@test.local')
    // Give a straggler duplicate a moment to land, if the race lost.
    await new Promise((resolve) => setTimeout(resolve, 100))
    const cases = await casesFor('recover-dedup-race@test.local')
    expect(cases).toHaveLength(1)
  })

  it(`stops opening new cases after ${ACCOUNT_RECOVERY_MAX_PER_DAY} in a day for the same account`, async () => {
    const email = 'recover-cap@test.local'
    await signUp(email)
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })

    // Pre-existing cases, all resolved — so the dedup check (which only
    // looks at OPEN cases) does not short-circuit before the cap does.
    for (let i = 0; i < ACCOUNT_RECOVERY_MAX_PER_DAY; i += 1) {
      em.persist(
        em.create(ModerationCase, {
          type: ModerationCaseType.ACCOUNT_RECOVERY,
          origin: ModerationCaseOrigin.USER,
          targetAccount: account,
          state: ModerationCaseState.RESOLVED,
        }),
      )
    }
    await em.flush()

    await service.open(email, SECURITY_ANSWER, JPG_BYTES, 'jpg')

    const cases = await casesFor(email)
    expect(cases).toHaveLength(ACCOUNT_RECOVERY_MAX_PER_DAY)
  })
})
