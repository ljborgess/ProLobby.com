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
import { DeclaredClub } from '../src/modules/account/declared-club.entity'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { CapturingMailSender } from './support/capturing-mail-sender'

const PASSWORD = 'a-long-enough-password'

/** Phase 2.5, #229: the account's own club declaration — RF-006. */
describe('declared club (#229)', () => {
  let app: INestApplication
  let orm: MikroORM
  let counter = 0

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  const account = async (): Promise<{ id: string; cookie: string }> => {
    const email = `club-${++counter}@test.local`
    await request(app.getHttpServer()).post('/api/accounts').send({
      email,
      password: PASSWORD,
      birthDate: '1990-05-20',
      securityQuestion: 'Qual o nome do seu primeiro time?',
      securityAnswer: 'São Paulo',
      acceptedTermsVersion: CURRENT_TERMS_VERSION,
    })
    const em = orm.em.fork()
    const found = await em.findOneOrFail(Account, { email })
    found.emailVerified = true
    found.state = AccountState.ACTIVE
    await em.flush()
    const res = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ email, password: PASSWORD })
    return { id: found.id, cookie: cookieOf(res) }
  }

  const declare = (cookie: string, body: object) =>
    request(app.getHttpServer()).put('/api/accounts/me/club').set('Cookie', cookie).send(body)
  const read = (cookie: string) =>
    request(app.getHttpServer()).get('/api/accounts/me/club').set('Cookie', cookie)

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

  it('starts empty, then shows what was declared', async () => {
    const { cookie } = await account()
    expect((await read(cookie)).body).toEqual({ club: null })

    const res = await declare(cookie, { freeSlots: 3, clubName: '  Várzea FC  ' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      freeSlots: 3,
      clubName: 'Várzea FC',
      // Nothing chosen: the default kit.
      kit: { primary: 'white', secondary: 'navy', pattern: 'plain', crest: 'shield' },
      updatedAt: expect.any(String),
    })
    expect((await read(cookie)).body.club).toMatchObject({ freeSlots: 3, clubName: 'Várzea FC' })
  })

  it.each([
    [{ freeSlots: -1, clubName: 'Clube' }],
    [{ freeSlots: 11, clubName: 'Clube' }],
    [{ freeSlots: 2.5, clubName: 'Clube' }],
    [{ freeSlots: '3', clubName: 'Clube' }],
    [{ freeSlots: 3, clubName: 'x'.repeat(21) }],
    [{ freeSlots: 3, clubName: '   ' }],
    [{ freeSlots: 3, clubName: 'Clube\u200bFC' }],
    [{ freeSlots: 3, clubName: 'Clube\u202eCF' }],
    [{ freeSlots: 3 }],
    [{ freeSlots: 3, clubName: 'Clube', kitPrimary: '#ff0000' }],
    [{ freeSlots: 3, clubName: 'Clube', kitPattern: 'polka' }],
    [{ freeSlots: 3, clubName: 'Clube', crestShape: 'star' }],
  ])('refuses %j in the API, not just on the screen', async (body) => {
    const { cookie } = await account()

    const res = await declare(cookie, body)

    expect(res.status).toBe(400)
    expect((await read(cookie)).body).toEqual({ club: null })
  })

  it('accepts the edges: 0 and 10 slots, 20 characters', async () => {
    const { cookie } = await account()

    expect((await declare(cookie, { freeSlots: 0, clubName: 'x'.repeat(20) })).status).toBe(200)
    expect((await declare(cookie, { freeSlots: 10, clubName: 'Clube' })).status).toBe(200)
  })

  it('takes the kit from the closed set, and a save without it keeps the kit (Kit Lab)', async () => {
    const { cookie } = await account()
    const kit = {
      kitPrimary: 'claret',
      kitSecondary: 'sky',
      kitPattern: 'stripes',
      crestShape: 'round',
    }

    expect((await declare(cookie, { freeSlots: 4, clubName: 'Várzea', ...kit })).body.kit).toEqual({
      primary: 'claret',
      secondary: 'sky',
      pattern: 'stripes',
      crest: 'round',
    })
    const renamed = await declare(cookie, { freeSlots: 6, clubName: 'Várzea FC' })

    expect(renamed.body).toMatchObject({
      freeSlots: 6,
      kit: { primary: 'claret', pattern: 'stripes' },
    })

    // Only one part of the kit sent: that one changes, the rest stays.
    const repainted = await declare(cookie, {
      freeSlots: 6,
      clubName: 'Várzea FC',
      kitPattern: 'hoops',
    })
    expect(repainted.body.kit).toEqual({
      primary: 'claret',
      secondary: 'sky',
      pattern: 'hoops',
      crest: 'round',
    })
  })

  it('keeps one per account: declaring again replaces and moves updatedAt', async () => {
    const { id, cookie } = await account()
    const first = await declare(cookie, { freeSlots: 3, clubName: 'Antigo' })

    const second = await declare(cookie, { freeSlots: 5, clubName: 'Novo' })

    expect(second.body).toMatchObject({ freeSlots: 5, clubName: 'Novo' })
    expect(new Date(second.body.updatedAt).getTime()).toBeGreaterThan(
      new Date(first.body.updatedAt).getTime(),
    )
    expect(await orm.em.fork().count(DeclaredClub, { account: id })).toBe(1)
  })

  it('keeps one row when two declarations land at once', async () => {
    const { id, cookie } = await account()

    const results = await Promise.all([
      declare(cookie, { freeSlots: 1, clubName: 'Um' }),
      declare(cookie, { freeSlots: 2, clubName: 'Dois' }),
    ])

    expect(results.map((res) => res.status)).toEqual([200, 200])
    expect(await orm.em.fork().count(DeclaredClub, { account: id })).toBe(1)
  })

  it('refuses fields the form does not expose (mass assignment)', async () => {
    const { cookie } = await account()

    const res = await declare(cookie, { freeSlots: 3, clubName: 'Clube', account: 'other' })

    expect(res.status).toBe(400)
  })

  it("never shows nor touches another account's declaration", async () => {
    const owner = await account()
    const other = await account()
    await declare(owner.cookie, { freeSlots: 4, clubName: 'Do Dono' })

    expect((await read(other.cookie)).body).toEqual({ club: null })
    await request(app.getHttpServer()).delete('/api/accounts/me/club').set('Cookie', other.cookie)
    expect((await read(owner.cookie)).body.club).toMatchObject({ clubName: 'Do Dono' })
  })

  it('deletes it, and deleting twice is fine', async () => {
    const { cookie } = await account()
    await declare(cookie, { freeSlots: 4, clubName: 'Clube' })
    const remove = () =>
      request(app.getHttpServer()).delete('/api/accounts/me/club').set('Cookie', cookie)

    expect((await remove()).status).toBe(204)
    expect((await remove()).status).toBe(204)
    expect((await read(cookie)).body).toEqual({ club: null })
  })

  it('needs a session', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/accounts/me/club')
      .send({ freeSlots: 3, clubName: 'Clube' })

    expect(res.status).toBe(401)
  })
})
