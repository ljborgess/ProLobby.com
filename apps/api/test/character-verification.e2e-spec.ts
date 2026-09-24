import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { Platform } from '../src/common/domain/platform.enum'
import { MailSender } from '../src/common/mail/mail.types'
import { hashGamertag, readIdentityHmacSecret } from '../src/common/security/identity-hmac'
import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME } from '../src/common/security/session-cookie'
import { Account } from '../src/modules/account/account.entity'
import { AccountRole, AccountState } from '../src/modules/account/account.enums'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { Character, CharacterState } from '../src/modules/character/character.entity'
import { PlatformGamertag } from '../src/modules/character/platform-gamertag.entity'
import { BlockedIdentity } from '../src/modules/moderation/blocked-identity.entity'
import { CapturingMailSender } from './support/capturing-mail-sender'
import { makePng } from './support/png'

const PASSWORD = 'a-long-enough-password'

/** Phase 2.2, #198: a moderator verifies the character from its print. */
describe('character verification by moderation (#198)', () => {
  let app: INestApplication
  let orm: MikroORM
  let counter = 0
  let moderator: string
  let moderatorEmail: string

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  const account = async (): Promise<{ email: string; cookie: string }> => {
    const email = `verify-${++counter}@test.local`
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
    return { email, cookie: cookieOf(res) }
  }

  /** A player with a midfield character and one received print; returns the case. */
  const playerWithPrint = async (gamertag: string) => {
    const player = await account()
    const character = await request(app.getHttpServer())
      .post('/api/characters')
      .set('Cookie', player.cookie)
      .send({ category: 'midfielder', archetype: 'maestro', platform: 'ps5', gamertag })
    await request(app.getHttpServer())
      .post(`/api/characters/${character.body.id}/prints`)
      .set('Cookie', player.cookie)
      .attach('print', makePng(400, 300, ++counter), 'print.png')
    const list = await request(app.getHttpServer())
      .get('/api/moderation/character-verifications')
      .set('Cookie', moderator)
    const found = (list.body as { caseId: string; declaredGamertag: string }[]).find(
      (item) => item.declaredGamertag === gamertag,
    )
    return { player, characterId: character.body.id as string, caseId: found!.caseId }
  }

  const decide = (caseId: string, body: Record<string, unknown>, cookie = moderator) =>
    request(app.getHttpServer())
      .post(`/api/moderation/character-verifications/${caseId}/decisions`)
      .set('Cookie', cookie)
      .send(body)

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder'
    process.env.EVIDENCE_ENCRYPTION_KEY ??= randomBytes(32).toString('base64')
    process.env.IDENTITY_HMAC_SECRET ??= randomBytes(32).toString('base64')
    process.env.PRINTS_DIR = mkdtempSync(join(tmpdir(), 'prolobby-verify-'))

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailSender)
      .useValue(new CapturingMailSender())
      .compile()

    app = moduleRef.createNestApplication()
    applySecurity(app)
    await app.init()

    orm = moduleRef.get(MikroORM)
    await orm.getSchemaGenerator().refreshDatabase()

    const mod = await account()
    moderator = mod.cookie
    moderatorEmail = mod.email
    const em = orm.em.fork()
    const row = await em.findOneOrFail(Account, { email: mod.email })
    // Moderation needs an active account, like every route not widened by @AllowStates.
    row.role = AccountRole.MODERATOR
    row.emailVerified = true
    row.state = AccountState.ACTIVE
    await em.flush()
  }, 60_000)

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    delete process.env.PRINTS_DIR
    await app.close()
  })

  it('keeps the queue closed to anyone who is not a moderator', async () => {
    const { cookie } = await account()

    const res = await request(app.getHttpServer())
      .get('/api/moderation/character-verifications')
      .set('Cookie', cookie)

    expect(res.status).toBe(403)
  })

  it('serves the print decrypted, uncached and not sniffable', async () => {
    const { caseId } = await playerWithPrint('Serve1x')

    const res = await request(app.getHttpServer())
      .get(`/api/moderation/character-verifications/${caseId}/print`)
      .set('Cookie', moderator)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('image/png')
    expect(res.headers['cache-control']).toBe('private, no-store')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
  })

  it('verifies the character and its gamertag on approval', async () => {
    const { player, characterId, caseId } = await playerWithPrint('Approve1')

    const res = await decide(caseId, { approve: true, archetype: 'creator', gamertag: 'APPROVE1' })

    expect(res.body).toEqual({ approved: true, rejection: null })
    const em = orm.em.fork()
    const character = await em.findOneOrFail(Character, { id: characterId })
    expect(character.state).toBe(CharacterState.VERIFIED)
    expect(character.archetype).toBe('creator')
    const claim = await em.findOneOrFail(PlatformGamertag, {
      gamertagHash: hashGamertag(readIdentityHmacSecret(), 'approve1'),
    })
    expect(claim.verifiedAt).toBeInstanceOf(Date)
    const prerequisites = await request(app.getHttpServer())
      .get('/api/accounts/me/queue-prerequisites')
      .set('Cookie', player.cookie)
    expect(prerequisites.body.characterVerified).toBe(true)
    const list = await request(app.getHttpServer())
      .get('/api/characters')
      .set('Cookie', player.cookie)
    expect(list.body[0].lastPrint).toEqual({ status: 'accepted', rejection: null })
  })

  it('turns a different tag on the card into a rejection, never an approval', async () => {
    const { player, characterId, caseId } = await playerWithPrint('Declared1')

    const res = await decide(caseId, { approve: true, archetype: 'maestro', gamertag: 'Someone9' })

    expect(res.body).toEqual({ approved: false, rejection: 'gamertag_mismatch' })
    const character = await orm.em.fork().findOneOrFail(Character, { id: characterId })
    expect(character.state).toBe(CharacterState.PENDING_VERIFICATION)
    const list = await request(app.getHttpServer())
      .get('/api/characters')
      .set('Cookie', player.cookie)
    expect(list.body[0].lastPrint).toEqual({ status: 'rejected', rejection: 'gamertag_mismatch' })
  })

  it('rejects an archetype that does not fit the chosen category', async () => {
    const { caseId } = await playerWithPrint('Wrong1x')

    const res = await decide(caseId, { approve: true, archetype: 'finisher', gamertag: 'Wrong1x' })

    expect(res.body.rejection).toBe('archetype_mismatch')
  })

  it('records the cause a moderator picks by eye', async () => {
    const { caseId } = await playerWithPrint('Blurry1')

    const res = await decide(caseId, { approve: false, rejection: 'unreadable' })

    expect(res.body).toEqual({ approved: false, rejection: 'unreadable' })
  })

  it('says a banned tag is unavailable, only now that a print proves it', async () => {
    const em = orm.em.fork()
    em.persist(
      em.create(BlockedIdentity, {
        platform: Platform.PS5,
        gamertagHash: hashGamertag(readIdentityHmacSecret(), 'Banned2'),
        reason: 'test',
      }),
    )
    await em.flush()
    const { caseId } = await playerWithPrint('Banned2')

    const res = await decide(caseId, { approve: true, archetype: 'maestro', gamertag: 'Banned2' })

    expect(res.body.rejection).toBe('gamertag_unavailable')
  })

  it('says a tag already verified by another account is unavailable, in the same words', async () => {
    const first = await playerWithPrint('Twice2x')
    await decide(first.caseId, { approve: true, archetype: 'maestro', gamertag: 'Twice2x' })
    const second = await playerWithPrint('Twice2x')

    const res = await decide(second.caseId, {
      approve: true,
      archetype: 'maestro',
      gamertag: 'Twice2x',
    })

    expect(res.body.rejection).toBe('gamertag_unavailable')
  })

  it('never lets a moderator judge their own print', async () => {
    const own = await request(app.getHttpServer())
      .post('/api/characters')
      .set('Cookie', moderator)
      .send({ category: 'striker', archetype: 'target', platform: 'pc', gamertag: 'ModSelf1' })
    await request(app.getHttpServer())
      .post(`/api/characters/${own.body.id}/prints`)
      .set('Cookie', moderator)
      .attach('print', makePng(400, 300, ++counter), 'print.png')
    const em = orm.em.fork()
    const { ModerationCase } = await import('../src/modules/moderation/moderation-case.entity')
    const ownCase = await em.findOneOrFail(ModerationCase, {
      targetAccount: { email: moderatorEmail },
    })

    const list = await request(app.getHttpServer())
      .get('/api/moderation/character-verifications')
      .set('Cookie', moderator)
    expect(list.body.map((item: { caseId: string }) => item.caseId)).not.toContain(ownCase.id)
    expect((await decide(ownCase.id, { approve: false, rejection: 'unreadable' })).status).toBe(403)
  })

  it('decides a case once', async () => {
    const { caseId } = await playerWithPrint('Once1xx')
    await decide(caseId, { approve: false, rejection: 'unreadable' })

    expect((await decide(caseId, { approve: false, rejection: 'unreadable' })).status).toBe(404)
  })

  it.each([
    [{ approve: true, archetype: 'maestro' }],
    [{ approve: false, rejection: 'gamertag_mismatch' }],
    [{ approve: false }],
  ])('refuses an incomplete or server-only decision %j', async (body) => {
    const { caseId } = await playerWithPrint(`Bad${counter}xx`)

    expect((await decide(caseId, body)).status).toBe(400)
  })
})
