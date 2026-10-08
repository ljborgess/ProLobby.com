import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes, randomUUID } from 'node:crypto'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { CURRENT_EDITION } from '../src/common/domain/game-edition.enum'
import { Platform } from '../src/common/domain/platform.enum'
import { MailSender } from '../src/common/mail/mail.types'
import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME } from '../src/common/security/session-cookie'
import { Account } from '../src/modules/account/account.entity'
import { AccountState } from '../src/modules/account/account.enums'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { Archetype, CharacterCategory } from '../src/modules/character/archetype'
import { Character, CharacterState } from '../src/modules/character/character.entity'
import { QueueEntry } from '../src/modules/queue/queue-entry.entity'
import { EloEvent } from '../src/modules/ranking/elo-event.entity'
import { EloEventReason } from '../src/modules/ranking/ranking-event.enums'
import { CapturingMailSender } from './support/capturing-mail-sender'
import { makePng } from './support/png'

const PASSWORD = 'a-long-enough-password'

/** Phase 2.5, #228: joining and leaving the queue — RF-001, RF-002, RF-003, RF-031. */
describe('queue entry (#228)', () => {
  let app: INestApplication
  let orm: MikroORM
  let counter = 0

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  /** A signed-in account; `ready` meets every prerequisite but the character. */
  const account = async (ready = true): Promise<{ id: string; cookie: string }> => {
    const email = `queue-${++counter}@test.local`
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
    if (ready) {
      found.emailVerified = true
      found.state = AccountState.ACTIVE
      found.discordIdHash = randomUUID()
      await em.flush()
    }
    const res = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ email, password: PASSWORD })
    return { id: found.id, cookie: cookieOf(res) }
  }

  const character = async (
    accountId: string,
    state = CharacterState.VERIFIED,
    category = CharacterCategory.MIDFIELDER,
  ): Promise<string> => {
    const em = orm.em.fork()
    const created = em.create(Character, {
      account: em.getReference(Account, accountId),
      category,
      archetype: category === CharacterCategory.STRIKER ? Archetype.FINISHER : Archetype.MAESTRO,
      platform: Platform.PS5,
      edition: CURRENT_EDITION,
      state,
      verifiedAt: state === CharacterState.VERIFIED ? new Date() : undefined,
    })
    await em.flush()
    return created.id
  }

  const join = (cookie: string, characterId: string) =>
    request(app.getHttpServer()).post('/api/queue').set('Cookie', cookie).send({ characterId })

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

  it('takes a verified character and shows the place', async () => {
    const { id, cookie } = await account()
    const characterId = await character(id)

    const res = await join(cookie, characterId)

    expect(res.status).toBe(201)
    expect(res.body).toEqual({
      characterId,
      category: 'midfielder',
      joinedAt: expect.any(String),
      lobby: null,
    })
    const current = await request(app.getHttpServer()).get('/api/queue').set('Cookie', cookie)
    expect(current.body.entry).toMatchObject({ characterId })
  })

  it('refuses a second entry, with any character (RF-001)', async () => {
    const { id, cookie } = await account()
    await join(cookie, await character(id))

    const res = await join(cookie, await character(id, undefined, CharacterCategory.STRIKER))

    expect(res.status).toBe(409)
    expect(res.body.message).toBe('already_in_queue')
  })

  it('lets one of two joins at once land (RF-001)', async () => {
    const { id, cookie } = await account()
    const a = await character(id)
    const b = await character(id, undefined, CharacterCategory.STRIKER)

    const results = await Promise.all([join(cookie, a), join(cookie, b)])

    expect(results.map((res) => res.status).sort()).toEqual([201, 409])
    expect(await orm.em.fork().count(QueueEntry, { account: id })).toBe(1)
  })

  it('lists every missing prerequisite at once, in order (RF-002)', async () => {
    const { id, cookie } = await account(false)

    const res = await join(cookie, await character(id, CharacterState.PENDING_VERIFICATION))

    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({
      message: 'queue_prerequisites_missing',
      missing: ['email', 'character', 'discord'],
    })
  })

  it('names leaving the Discord server as its own reason', async () => {
    const { id, cookie } = await account()
    await orm.em.fork().nativeUpdate(Account, { id }, { discordPresent: false })

    const res = await join(cookie, await character(id))

    expect(res.body.missing).toEqual(['discord_server'])
  })

  it("refuses another account's character", async () => {
    const owner = await account()
    const characterId = await character(owner.id)

    const res = await join((await account()).cookie, characterId)

    expect(res.status).toBe(404)
  })

  it('freezes the elo at entry (RF-003)', async () => {
    const { id, cookie } = await account()
    const characterId = await character(id)
    await join(cookie, characterId)
    const em = orm.em.fork()
    em.create(EloEvent, {
      character: em.getReference(Character, characterId),
      delta: 30,
      reason: EloEventReason.MATCH_RESULT,
      lobbyId: randomUUID(),
    })
    await em.flush()

    const entry = await orm.em.fork().findOneOrFail(QueueEntry, { account: id })

    expect(entry.eloAtEntry).toBe(1000)
  })

  it('locks the queued character, and only it (RF-031)', async () => {
    const { id, cookie } = await account()
    const queued = await character(id)
    const other = await character(id, undefined, CharacterCategory.STRIKER)
    await join(cookie, queued)
    const print = (characterId: string, seed: number) =>
      request(app.getHttpServer())
        .post(`/api/characters/${characterId}/prints`)
        .set('Cookie', cookie)
        .field('activeArchetypeConfirmed', 'true')
        .attach('print', makePng(400, 300, seed), 'print.png')

    const locked = await print(queued, 100)
    const free = await print(other, 101)
    const category = await request(app.getHttpServer())
      .patch(`/api/characters/${queued}`)
      .set('Cookie', cookie)
      .send({ category: 'winger' })

    expect(locked.status).toBe(409)
    expect(locked.body.message).toBe('character_in_queue')
    expect(free.status).not.toBe(409)
    expect(category.body.message).toBe('character_in_queue')
  })

  it('frees the account and the character on leaving', async () => {
    const { id, cookie } = await account()
    const characterId = await character(id)
    await join(cookie, characterId)

    const left = await request(app.getHttpServer()).delete('/api/queue').set('Cookie', cookie)

    expect(left.status).toBe(204)
    expect((await join(cookie, characterId)).status).toBe(201)
  })

  it('shows each category as a band, never as a count (RF-008, #233)', async () => {
    for (let i = 0; i < 16; i += 1) {
      const { id, cookie } = await account()
      await join(cookie, await character(id))
    }
    const { cookie } = await account()

    const res = await request(app.getHttpServer()).get('/api/queue/movement').set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ midfielder: 'full', goalkeeper: 'low' })
    expect(Object.keys(res.body).sort()).toEqual(
      ['defender', 'goalkeeper', 'midfielder', 'striker', 'winger'].sort(),
    )
    expect(res.text).not.toMatch(/\d/)
  })

  it('needs a session', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/queue')
      .send({ characterId: randomUUID() })

    expect(res.status).toBe(401)
  })
})
