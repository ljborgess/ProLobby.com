import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes } from 'node:crypto'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { MailSender } from '../src/common/mail/mail.types'
import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME } from '../src/common/security/session-cookie'
import { Account } from '../src/modules/account/account.entity'
import { AccountState } from '../src/modules/account/account.enums'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { CapturingMailSender } from './support/capturing-mail-sender'

const PASSWORD = 'a-long-enough-password'

/** #335: the platform nickname, how ranking and profile show a player. */
describe('platform nickname (#335)', () => {
  let app: INestApplication
  let orm: MikroORM
  let counter = 0

  const signedIn = async (): Promise<string> => {
    const email = `nick-${++counter}@test.local`
    await request(app.getHttpServer()).post('/api/accounts').send({
      email,
      password: PASSWORD,
      birthDate: '1990-05-20',
      securityQuestion: 'Qual o nome do seu primeiro time?',
      securityAnswer: 'São Paulo',
      acceptedTermsVersion: CURRENT_TERMS_VERSION,
    })
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    account.emailVerified = true
    account.state = AccountState.ACTIVE
    await em.flush()
    const res = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ email, password: PASSWORD })
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  const put = (cookie: string, nickname: unknown) =>
    request(app.getHttpServer())
      .put('/api/accounts/me/nickname')
      .set('Cookie', cookie)
      .send({ nickname })
  const get = (cookie: string) =>
    request(app.getHttpServer()).get('/api/accounts/me/nickname').set('Cookie', cookie)

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder-0123456789'
    process.env.EVIDENCE_ENCRYPTION_KEY ??= randomBytes(32).toString('base64')
    process.env.IDENTITY_HMAC_SECRET ??= randomBytes(32).toString('base64')
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
    await app.close()
  })

  it('starts without one, then sets, changes and clears it', async () => {
    const cookie = await signedIn()
    expect((await get(cookie)).body).toEqual({ nickname: null })

    expect((await put(cookie, 'Craque_10')).body).toEqual({ nickname: 'Craque_10' })
    expect((await get(cookie)).body).toEqual({ nickname: 'Craque_10' })
    expect((await put(cookie, 'Maestro')).body).toEqual({ nickname: 'Maestro' })
    expect((await put(cookie, null)).body).toEqual({ nickname: null })
    expect((await get(cookie)).body).toEqual({ nickname: null })
  })

  it('refuses a name someone has, in any case, and frees it once dropped', async () => {
    const first = await signedIn()
    const second = await signedIn()
    expect((await put(first, 'Paredao')).status).toBe(200)

    const taken = await put(second, 'PAREDAO')
    expect(taken.status).toBe(409)
    expect(taken.body.message).toBe('nickname_taken')

    await put(first, null)
    expect((await put(second, 'PAREDAO')).status).toBe(200)
  })

  it('keeps their own name on a second set of the same one', async () => {
    const cookie = await signedIn()
    await put(cookie, 'Mesmo')
    expect((await put(cookie, 'mesmo')).body).toEqual({ nickname: 'mesmo' })
  })

  it('gives one of two people asking for the same name at once', async () => {
    const [a, b] = [await signedIn(), await signedIn()]
    const results = await Promise.all([put(a, 'Corrida'), put(b, 'corrida')])
    expect(results.map((r) => r.status).sort()).toEqual([200, 409])
  })

  it.each([
    ['too short', 'ab'],
    ['too long', 'a'.repeat(17)],
    ['a space', 'dois nomes'],
    ['an accent', 'Joao_São'],
    ['a Cyrillic a', 'Crаque'],
    ['a symbol', 'nome!'],
    ['not a string', 123],
  ])('refuses %s', async (_, nickname) => {
    const cookie = await signedIn()
    expect((await put(cookie, nickname)).status).toBe(400)
  })

  it('refuses a body without the field, and asks for a session', async () => {
    const cookie = await signedIn()
    const empty = await request(app.getHttpServer())
      .put('/api/accounts/me/nickname')
      .set('Cookie', cookie)
      .send({})
    expect(empty.status).toBe(400)
    expect((await put('', 'Ninguem')).status).toBe(401)
  })
})
