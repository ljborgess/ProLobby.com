import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { MailSender } from '../src/common/mail/mail.types'
import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME } from '../src/common/security/session-cookie'
import { Account } from '../src/modules/account/account.entity'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { PrintSubmission } from '../src/modules/character/print-submission.entity'
import {
  PRINT_UPLOADS_PER_HOUR,
  PrintSubmissionService,
} from '../src/modules/character/print-submission.service'
import { CapturingMailSender } from './support/capturing-mail-sender'
import { makePng } from './support/png'

const PASSWORD = 'a-long-enough-password'

/** Phase 2.2, #195: everything before verification — RF-063, RF-064, RF-065. */
describe('print submissions (#195)', () => {
  let app: INestApplication
  let orm: MikroORM
  let counter = 0

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  const account = async (): Promise<string> => {
    const email = `print-${++counter}@test.local`
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
    return cookieOf(res)
  }

  const character = async (cookie: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/characters')
      .set('Cookie', cookie)
      .send({
        category: 'midfielder',
        archetype: 'maestro',
        platform: 'ps5',
        gamertag: `Tag${counter}x`,
      })
    return res.body.id as string
  }

  const send = (cookie: string, characterId: string, file: Buffer, name = 'print.png') =>
    request(app.getHttpServer())
      .post(`/api/characters/${characterId}/prints`)
      .set('Cookie', cookie)
      .field('activeArchetypeConfirmed', 'true')
      .attach('print', file, name)

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder-0123456789'
    process.env.EVIDENCE_ENCRYPTION_KEY ??= randomBytes(32).toString('base64')
    process.env.IDENTITY_HMAC_SECRET ??= randomBytes(32).toString('base64')
    process.env.PRINTS_DIR = mkdtempSync(join(tmpdir(), 'prolobby-prints-'))

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailSender)
      .useValue(new CapturingMailSender())
      .compile()

    app = moduleRef.createNestApplication()
    applySecurity(app)
    await app.init()

    orm = moduleRef.get(MikroORM)
    await orm.getSchemaGenerator().refreshDatabase()
  }, 60_000)

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    delete process.env.PRINTS_DIR
    await app.close()
  })

  it('stores a valid print encrypted and records it as received', async () => {
    const cookie = await account()
    const file = makePng(400, 300, 1)

    const res = await send(cookie, await character(cookie), file)

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ id: expect.any(String), status: 'received', rejection: null })
    const stored = await orm.em.fork().findOneOrFail(PrintSubmission, { id: res.body.id })
    expect(stored.fileHash).toHaveLength(64)
    expect(existsSync(stored.filePath!)).toBe(true)
    expect(readFileSync(stored.filePath!).includes(file)).toBe(false)
  })

  it('refuses the same file a second time, even from another account (RF-063)', async () => {
    const file = makePng(400, 300, 2)
    const first = await account()
    await send(first, await character(first), file)

    const second = await account()
    const res = await send(second, await character(second), file)

    expect(res.status).toBe(201)
    expect(res.body.rejection).toBe('print_already_used')
  })

  it('refuses an image below 320×240 and says so (RF-064)', async () => {
    const cookie = await account()

    const res = await send(cookie, await character(cookie), makePng(300, 200, 3))

    expect(res.body).toMatchObject({ status: 'rejected', rejection: 'image_too_small' })
  })

  it('accepts a real video frame size that the old 800×600 floor refused', async () => {
    const cookie = await account()

    const res = await send(cookie, await character(cookie), makePng(926, 521, 4))

    expect(res.body.status).toBe('received')
  })

  it('judges the type by the bytes, not by the name', async () => {
    const cookie = await account()

    const res = await send(
      cookie,
      await character(cookie),
      Buffer.from('<?php echo "hi"; ?> padding padding'),
      'print.png',
    )

    expect(res.body.rejection).toBe('invalid_format')
  })

  it('refuses the eleventh attempt of the hour with the time left, rejected ones counting (RF-065)', async () => {
    const cookie = await account()
    const id = await character(cookie)
    for (let i = 0; i < PRINT_UPLOADS_PER_HOUR; i += 1) {
      await send(cookie, id, Buffer.from(`not an image, attempt ${i} ......`))
    }

    const res = await send(cookie, id, makePng(400, 300, 5))

    expect(res.status).toBe(429)
    expect(res.body.message).toBe('upload_limit')
    expect(res.body.retryAfterSeconds).toBeGreaterThan(0)
  })

  it("refuses a print for another account's character", async () => {
    const owner = await account()
    const id = await character(owner)

    const res = await send(await account(), id, makePng(400, 300, 6))

    expect(res.status).toBe(404)
  })

  it('asks for the file when none is sent', async () => {
    const cookie = await account()

    const res = await request(app.getHttpServer())
      .post(`/api/characters/${await character(cookie)}/prints`)
      .set('Cookie', cookie)

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('print_required')
  })

  it('deletes the file after 90 days and keeps the hash, so the print stays unusable', async () => {
    const cookie = await account()
    const file = makePng(400, 300, 7)
    const { body } = await send(cookie, await character(cookie), file)
    const stored = await orm.em.fork().findOneOrFail(PrintSubmission, { id: body.id })

    const deleted = await app
      .get(PrintSubmissionService)
      .deleteExpiredFiles(new Date(Date.now() + 91 * 24 * 60 * 60 * 1000))

    expect(deleted).toBeGreaterThanOrEqual(1)
    expect(existsSync(stored.filePath!)).toBe(false)
    const after = await orm.em.fork().findOneOrFail(PrintSubmission, { id: body.id })
    expect(after.filePath ?? null).toBeNull()
    expect(after.fileHash).toBe(stored.fileHash)
    const again = await send(cookie, await character(cookie), file)
    expect(again.body.rejection).toBe('print_already_used')
  })

  it('refuses a header that claims more than 8192 px a side', async () => {
    const cookie = await account()
    const bomb = makePng(400, 300, 9)
    bomb.writeUInt32BE(100_000, 16)

    const res = await send(cookie, await character(cookie), bomb)

    expect(res.body.rejection).toBe('invalid_format')
  })

  it('holds the hourly limit when uploads arrive at once (RF-065)', async () => {
    const cookie = await account()
    const id = await character(cookie)

    const results = await Promise.all(
      Array.from({ length: PRINT_UPLOADS_PER_HOUR + 2 }, (_, i) =>
        send(cookie, id, Buffer.from(`not an image, parallel ${i} ......`)),
      ),
    )

    expect(results.filter((res) => res.status === 201)).toHaveLength(PRINT_UPLOADS_PER_HOUR)
    expect(results.filter((res) => res.status === 429)).toHaveLength(2)
  })

  it('lets only one of two accounts sending the same file at once keep it (RF-063)', async () => {
    const file = makePng(400, 300, 10)
    const first = await account()
    const second = await account()
    const [a, b] = [await character(first), await character(second)]

    const results = await Promise.all([send(first, a, file), send(second, b, file)])

    expect(results.map((res) => res.body.status).sort()).toEqual(['received', 'rejected'])
    expect(results.map((res) => res.body.rejection)).toContain('print_already_used')
  })

  it('deletes the file of a deleted account on the next run and keeps the hash', async () => {
    const cookie = await account()
    const file = makePng(400, 300, 11)
    const { body } = await send(cookie, await character(cookie), file)
    const em = orm.em.fork()
    const stored = await em.findOneOrFail(
      PrintSubmission,
      { id: body.id },
      { populate: ['account'] },
    )
    await em.nativeDelete(Account, { id: stored.account!.id })

    await app.get(PrintSubmissionService).deleteExpiredFiles()

    expect(existsSync(stored.filePath!)).toBe(false)
    const after = await orm.em.fork().findOneOrFail(PrintSubmission, { id: body.id })
    expect(after.fileHash).toBe(stored.fileHash)
  })

  it('needs a session', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/characters/11111111-1111-1111-1111-111111111111/prints')
      .attach('print', makePng(400, 300, 8), 'print.png')

    expect(res.status).toBe(401)
  })
})
