import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes } from 'node:crypto'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { Platform } from '../src/common/domain/platform.enum'
import { hashGamertag, readIdentityHmacSecret } from '../src/common/security/identity-hmac'
import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME } from '../src/common/security/session-cookie'
import { MailSender } from '../src/common/mail/mail.types'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { Character, CharacterState } from '../src/modules/character/character.entity'
import { CHARACTER_CREATIONS_PER_HOUR } from '../src/modules/character/character.service'
import { PlatformGamertag } from '../src/modules/character/platform-gamertag.entity'
import { BlockedIdentity } from '../src/modules/moderation/blocked-identity.entity'
import { CapturingMailSender } from './support/capturing-mail-sender'

const PASSWORD = 'a-long-enough-password'

/** Phase 2.2, #194: character, category × archetype, gamertag per platform. */
describe('characters (#194)', () => {
  let app: INestApplication
  let orm: MikroORM
  let counter = 0

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  const account = async (): Promise<string> => {
    const email = `character-${++counter}@test.local`
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

  const create = (cookie: string, body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/api/characters').set('Cookie', cookie).send(body)

  const midfielder = (gamertag: string) => ({
    category: 'midfielder',
    archetype: 'maestro',
    platform: 'ps5',
    gamertag,
  })

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder'
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

  it('creates a pending character and answers only what the screen needs', async () => {
    const cookie = await account()

    const res = await create(cookie, { ...midfielder('Pellavo7'), name: 'Meu meia' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      category: 'midfielder',
      archetype: 'maestro',
      platform: 'ps5',
      edition: 'fc27',
      name: 'Meu meia',
      state: 'pending_verification',
      matchesInCategory: 0,
    })
    expect(Object.keys(res.body).sort()).toEqual([
      'archetype',
      'category',
      'edition',
      'id',
      'matchesInCategory',
      'name',
      'platform',
      'state',
    ])
    expect(JSON.stringify(res.body)).not.toContain('Pellavo7')
  })

  it.each([
    ['finisher', 'goalkeeper'],
    ['sweeper_keeper', 'striker'],
    ['maestro', 'defender'],
  ])('refuses %s as %s', async (archetype, category) => {
    const cookie = await account()

    const res = await create(cookie, { ...midfielder('Mismatch1'), archetype, category })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('archetype_category_mismatch')
  })

  it('accepts a midfield archetype as a winger, and a forward one as a striker', async () => {
    const cookie = await account()

    expect((await create(cookie, { ...midfielder('Wide1'), category: 'winger' })).status).toBe(201)
    expect(
      (await create(cookie, { ...midfielder('Wide1'), archetype: 'spark', category: 'striker' }))
        .status,
    ).toBe(201)
  })

  it('keeps the gamertag as hash and ciphertext, never in plain text', async () => {
    const cookie = await account()
    await create(cookie, midfielder('Ra5ko'))

    const claim = await orm.em.fork().findOneOrFail(PlatformGamertag, {
      gamertagHash: hashGamertag(readIdentityHmacSecret(), 'ra5ko'),
    })

    expect(claim.platform).toBe(Platform.PS5)
    expect(claim.verifiedAt ?? null).toBeNull()
    expect(claim.gamertagEncrypted.toString()).not.toContain('Ra5ko')
  })

  it('lets two accounts claim the same unverified tag — exclusivity starts at verification', async () => {
    expect((await create(await account(), midfielder('Shared1'))).status).toBe(201)
    expect((await create(await account(), midfielder('Shared1'))).status).toBe(201)
  })

  // Typing a tag proves nothing, so creation must not tell anyone whether a
  // stranger's tag is banned or verified elsewhere. Both are checked when a
  // print proves ownership (#197, #198).
  it('does not reveal that a tag is verified by another account', async () => {
    await create(await account(), midfielder('Verified1'))
    const em = orm.em.fork()
    const claim = await em.findOneOrFail(PlatformGamertag, {
      gamertagHash: hashGamertag(readIdentityHmacSecret(), 'Verified1'),
    })
    claim.verifiedAt = new Date()
    await em.flush()

    expect((await create(await account(), midfielder('VERIFIED1'))).status).toBe(201)
  })

  it('does not reveal that a tag is on the ban list', async () => {
    const em = orm.em.fork()
    em.persist(
      em.create(BlockedIdentity, {
        platform: Platform.PS5,
        gamertagHash: hashGamertag(readIdentityHmacSecret(), 'Banned1'),
        reason: 'test',
      }),
    )
    await em.flush()

    expect((await create(await account(), midfielder('banned1'))).status).toBe(201)
  })

  it('lets a provisional tag be corrected, and keeps the new spelling', async () => {
    const cookie = await account()
    await create(cookie, midfielder('Typoo1'))
    await create(cookie, { ...midfielder('Typo1'), archetype: 'creator' })

    const claims = await orm.em.fork().find(PlatformGamertag, {
      gamertagHash: {
        $in: ['Typoo1', 'Typo1'].map((tag) => hashGamertag(readIdentityHmacSecret(), tag)),
      },
    })

    expect(claims).toHaveLength(1)
    expect(claims[0]?.gamertagHash).toBe(hashGamertag(readIdentityHmacSecret(), 'Typo1'))
  })

  it('refuses to change a tag once it is verified', async () => {
    const cookie = await account()
    await create(cookie, midfielder('Locked7'))
    const em = orm.em.fork()
    const claim = await em.findOneOrFail(PlatformGamertag, {
      gamertagHash: hashGamertag(readIdentityHmacSecret(), 'Locked7'),
    })
    claim.verifiedAt = new Date()
    await em.flush()

    const res = await create(cookie, { ...midfielder('Other7'), archetype: 'creator' })

    expect(res.status).toBe(409)
    expect(res.body.message).toBe('gamertag_change_requires_moderation')
  })

  it('inactivates the previous character of the category instead of deleting it (RF-027)', async () => {
    const cookie = await account()
    const first = (await create(cookie, midfielder('Twice1'))).body
    const second = (await create(cookie, { ...midfielder('Twice1'), archetype: 'creator' })).body

    const list = await request(app.getHttpServer()).get('/api/characters').set('Cookie', cookie)
    const stored = await orm.em.fork().findOneOrFail(Character, { id: first.id })

    expect(list.body.map((character: { id: string }) => character.id)).toEqual([second.id])
    expect(stored.state).toBe(CharacterState.INACTIVE)
  })

  it('carries the match count to the replacing character (RF-027)', async () => {
    const cookie = await account()
    const first = (await create(cookie, midfielder('Carry1'))).body
    const em = orm.em.fork()
    const row = await em.findOneOrFail(Character, { id: first.id })
    row.matchesInCategory = 3
    await em.flush()

    const second = (await create(cookie, { ...midfielder('Carry1'), archetype: 'creator' })).body

    expect(second.matchesInCategory).toBe(3)
    // And so RF-028 still holds: a fresh character is no way around the lock.
    const res = await request(app.getHttpServer())
      .patch(`/api/characters/${second.id}`)
      .set('Cookie', cookie)
      .send({ category: 'winger' })
    expect(res.status).toBe(409)
  })

  it('refuses to move a character into a category its archetype does not allow', async () => {
    const cookie = await account()
    const character = (await create(cookie, midfielder('Wrong1'))).body

    const res = await request(app.getHttpServer())
      .patch(`/api/characters/${character.id}`)
      .set('Cookie', cookie)
      .send({ category: 'goalkeeper' })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('archetype_category_mismatch')
  })

  it.each([['   '], ['name\u200b'], ['bad\u0007']])('refuses the name %j', async (name) => {
    const res = await create(await account(), { ...midfielder('Named1'), name })

    expect(res.status).toBe(400)
  })

  it('moves a character with no match to another allowed category', async () => {
    const cookie = await account()
    const character = (await create(cookie, midfielder('Move1'))).body

    const res = await request(app.getHttpServer())
      .patch(`/api/characters/${character.id}`)
      .set('Cookie', cookie)
      .send({ category: 'winger' })

    expect(res.status).toBe(200)
    expect(res.body.category).toBe('winger')
  })

  it('refuses to move the category after the first match (RF-028)', async () => {
    const cookie = await account()
    const character = (await create(cookie, midfielder('Locked1'))).body
    const em = orm.em.fork()
    const row = await em.findOneOrFail(Character, { id: character.id })
    row.matchesInCategory = 1
    await em.flush()

    const res = await request(app.getHttpServer())
      .patch(`/api/characters/${character.id}`)
      .set('Cookie', cookie)
      .send({ category: 'winger' })

    expect(res.status).toBe(409)
    expect(res.body.message).toBe('category_locked_after_match')
  })

  it('refuses to move into a category that already has an active character', async () => {
    const cookie = await account()
    const meia = (await create(cookie, midfielder('Taken1'))).body
    await create(cookie, { ...midfielder('Taken1'), archetype: 'spark', category: 'winger' })

    const res = await request(app.getHttpServer())
      .patch(`/api/characters/${meia.id}`)
      .set('Cookie', cookie)
      .send({ category: 'winger' })

    expect(res.status).toBe(409)
    expect(res.body.message).toBe('category_taken')
  })

  it("never lets one account touch another's character", async () => {
    const character = (await create(await account(), midfielder('Mine1'))).body

    const res = await request(app.getHttpServer())
      .patch(`/api/characters/${character.id}`)
      .set('Cookie', await account())
      .send({ category: 'winger' })

    expect(res.status).toBe(404)
  })

  it('reports characterVerified in the queue prerequisites', async () => {
    const cookie = await account()
    const prerequisites = () =>
      request(app.getHttpServer()).get('/api/accounts/me/queue-prerequisites').set('Cookie', cookie)
    const character = (await create(cookie, midfielder('Prereq1'))).body

    expect((await prerequisites()).body.characterVerified).toBe(false)

    const em = orm.em.fork()
    const row = await em.findOneOrFail(Character, { id: character.id })
    row.state = CharacterState.VERIFIED
    await em.flush()

    expect((await prerequisites()).body.characterVerified).toBe(true)
  })

  it('creates one character when two arrive at once for the same category', async () => {
    const cookie = await account()

    const results = await Promise.all([
      create(cookie, midfielder('Race1xx')),
      create(cookie, midfielder('Race1xx')),
    ])

    expect(results.map((res) => res.status).sort()).toEqual([201, 201])
    const list = await request(app.getHttpServer()).get('/api/characters').set('Cookie', cookie)
    expect(list.body).toHaveLength(1)
  })

  it('never answers 500 when a creation and a category move race for one category', async () => {
    const cookie = await account()
    const winger = (
      await create(cookie, { ...midfielder('Race2xx'), archetype: 'spark', category: 'winger' })
    ).body

    const [moved, created] = await Promise.all([
      request(app.getHttpServer())
        .patch(`/api/characters/${winger.id}`)
        .set('Cookie', cookie)
        .send({ category: 'midfielder' }),
      create(cookie, midfielder('Race2xx')),
    ])

    expect([moved.status, created.status]).not.toContain(500)
    const list = await request(app.getHttpServer()).get('/api/characters').set('Cookie', cookie)
    const midfield = list.body.filter(
      (item: { category: string }) => item.category === 'midfielder',
    )
    expect(midfield).toHaveLength(1)
  })

  it('caps creations per account per hour, whatever the address', async () => {
    const cookie = await account()
    for (let i = 0; i < CHARACTER_CREATIONS_PER_HOUR; i += 1) {
      await create(cookie, midfielder('Loop1xx'))
    }

    const res = await create(cookie, midfielder('Loop1xx'))

    expect(res.status).toBe(429)
    expect(res.body.message).toBe('character_create_limit')
  })

  it('rejects fields the server owns', async () => {
    const res = await create(await account(), { ...midfielder('Owned1'), state: 'verified' })

    expect(res.status).toBe(400)
  })

  it('serves the archetype × category table the screen filters with (#196)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/characters/archetypes')
      .set('Cookie', await account())

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(13)
    expect(res.body).toContainEqual({
      archetype: 'spark',
      group: 'forward',
      categories: ['winger', 'striker'],
    })
  })

  it('needs a session', async () => {
    expect((await request(app.getHttpServer()).get('/api/characters')).status).toBe(401)
  })
})
