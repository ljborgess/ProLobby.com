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
import { PrintSubmission } from '../src/modules/character/print-submission.entity'
import { AuditAction, AuditEntry } from '../src/modules/moderation/audit-entry.entity'
import { BlockedIdentity } from '../src/modules/moderation/blocked-identity.entity'
import { ModerationCase } from '../src/modules/moderation/moderation-case.entity'
import { ModerationCaseState } from '../src/modules/moderation/moderation-case.enums'
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
      .field('activeArchetypeConfirmed', 'true')
      .attach('print', makePng(400, 300, ++counter), 'print.png')
    const found = await orm.em.fork().findOneOrFail(ModerationCase, {
      printSubmission: { character: character.body.id },
    })
    return { player, characterId: character.body.id as string, caseId: found.id }
  }

  const decide = (caseId: string, body: Record<string, unknown>, cookie = moderator) =>
    request(app.getHttpServer())
      .post(`/api/moderation/character-verifications/${caseId}/decisions`)
      .set('Cookie', cookie)
      .send(body)

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder-0123456789'
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

  it('records the decision in the audit trail, with who decided (#243)', async () => {
    const { caseId } = await playerWithPrint('Audit1')

    await decide(caseId, { approve: false, rejection: 'unreadable' })

    const [entry, ...more] = await orm.em.fork().find(AuditEntry, { caseId })
    expect(more).toHaveLength(0)
    const moderatorAccount = await orm.em.fork().findOneOrFail(Account, { email: moderatorEmail })
    expect(entry).toMatchObject({
      action: AuditAction.CASE_RESOLVED,
      actorId: moderatorAccount.id,
      actorLabel: 'moderator',
      before: { state: 'open' },
      after: { state: 'resolved', decision: 'rejected: unreadable' },
    })
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
      .field('activeArchetypeConfirmed', 'true')
      .attach('print', makePng(400, 300, ++counter), 'print.png')
    const em = orm.em.fork()
    const ownCase = await em.findOneOrFail(ModerationCase, {
      targetAccount: { email: moderatorEmail },
    })

    const list = await request(app.getHttpServer())
      .get('/api/moderation/character-verifications')
      .set('Cookie', moderator)
    expect(list.body.map((item: { caseId: string }) => item.caseId)).not.toContain(ownCase.id)
    expect((await decide(ownCase.id, { approve: false, rejection: 'unreadable' })).status).toBe(403)
    const print = await request(app.getHttpServer())
      .get(`/api/moderation/character-verifications/${ownCase.id}/print`)
      .set('Cookie', moderator)
    expect(print.status).toBe(403)
  })

  it('never sends the declared archetype or gamertag to the browser', async () => {
    const { caseId } = await playerWithPrint('Hidden1')

    const list = await request(app.getHttpServer())
      .get('/api/moderation/character-verifications')
      .set('Cookie', moderator)

    const item = list.body.find((entry: { caseId: string }) => entry.caseId === caseId)
    expect(Object.keys(item).sort()).toEqual(['caseId', 'category', 'openedAt', 'platform'])
    expect(JSON.stringify(list.body)).not.toContain('Hidden1')
  })

  it('decides once when two moderators answer at the same moment', async () => {
    const { caseId } = await playerWithPrint('Twin1xx')
    const other = await account()
    const em = orm.em.fork()
    const row = await em.findOneOrFail(Account, { email: other.email })
    row.role = AccountRole.MODERATOR
    row.emailVerified = true
    row.state = AccountState.ACTIVE
    await em.flush()

    const results = await Promise.all([
      decide(caseId, { approve: true, archetype: 'maestro', gamertag: 'Twin1xx' }),
      decide(caseId, { approve: false, rejection: 'unreadable' }, other.cookie),
    ])

    expect(results.map((res) => res.status).sort()).toEqual([201, 404])
  })

  it('closes the open case of a character that gets replaced (RF-027)', async () => {
    const { player, caseId } = await playerWithPrint('Replace1')
    await request(app.getHttpServer())
      .post('/api/characters')
      .set('Cookie', player.cookie)
      .send({ category: 'midfielder', archetype: 'creator', platform: 'ps5', gamertag: 'Replace1' })

    const closed = await orm.em.fork().findOneOrFail(ModerationCase, { id: caseId })
    expect(closed.state).toBe(ModerationCaseState.RESOLVED)
    expect((await decide(caseId, { approve: false, rejection: 'unreadable' })).status).toBe(404)
  })

  it('never deadlocks when a decision and a replacement arrive together', async () => {
    const { player, caseId } = await playerWithPrint('Clash1x')

    const results = await Promise.all([
      decide(caseId, { approve: true, archetype: 'maestro', gamertag: 'Clash1x' }),
      request(app.getHttpServer()).post('/api/characters').set('Cookie', player.cookie).send({
        category: 'midfielder',
        archetype: 'creator',
        platform: 'ps5',
        gamertag: 'Clash1x',
      }),
    ])

    expect(results.map((res) => res.status)).not.toContain(500)
  })

  it('lets only one of two accounts verify the same tag when both are approved at once', async () => {
    const first = await playerWithPrint('Rival1x')
    const second = await playerWithPrint('Rival1x')
    const body = { approve: true, archetype: 'maestro', gamertag: 'Rival1x' }

    const results = await Promise.all([decide(first.caseId, body), decide(second.caseId, body)])

    expect(results.map((res) => res.status)).not.toContain(500)
    expect(results.filter((res) => res.body.approved === true)).toHaveLength(1)
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

  describe('confirmation and cooldown (#197)', () => {
    const resend = (cookie: string, characterId: string, confirmed = true) => {
      const req = request(app.getHttpServer())
        .post(`/api/characters/${characterId}/prints`)
        .set('Cookie', cookie)
      if (confirmed) {
        req.field('activeArchetypeConfirmed', 'true')
      }
      return req.attach('print', makePng(400, 300, ++counter), 'print.png')
    }

    /** Moves the approval back in time instead of waiting a day. */
    const verifiedHoursAgo = async (characterId: string, hours: number) => {
      const em = orm.em.fork()
      const character = await em.findOneOrFail(Character, { id: characterId })
      character.verifiedAt = new Date(Date.now() - hours * 60 * 60 * 1000)
      await em.flush()
    }

    it('refuses a print without the active-archetype confirmation, not counting it', async () => {
      const player = await account()
      const character = await request(app.getHttpServer())
        .post('/api/characters')
        .set('Cookie', player.cookie)
        .send({
          category: 'midfielder',
          archetype: 'maestro',
          platform: 'ps5',
          gamertag: 'NoTick1',
        })

      const res = await resend(player.cookie, character.body.id, false)

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('active_archetype_confirmation_required')
      const list = await request(app.getHttpServer())
        .get('/api/characters')
        .set('Cookie', player.cookie)
      expect(list.body[0].lastPrint).toBeNull()
    })

    it('refuses a second print while the first is in review', async () => {
      const { player, characterId } = await playerWithPrint('Queue2x')

      const res = await resend(player.cookie, characterId)

      expect(res.status).toBe(409)
      expect(res.body.message).toBe('print_in_review')
    })

    it('holds a new print for 24 h after an accepted one, with the time left (RF-030)', async () => {
      const { player, characterId, caseId } = await playerWithPrint('Cool1xx')
      await decide(caseId, { approve: true, archetype: 'maestro', gamertag: 'Cool1xx' })
      await verifiedHoursAgo(characterId, 23)

      const res = await resend(player.cookie, characterId)

      expect(res.status).toBe(429)
      expect(res.body.message).toBe('print_cooldown')
      expect(res.body.retryAfterSeconds).toBeGreaterThan(59 * 60)
      expect(res.body.retryAfterSeconds).toBeLessThanOrEqual(60 * 60)

      await verifiedHoursAgo(characterId, 24.1)
      const later = await resend(player.cookie, characterId)
      expect(later.body.status).toBe('received')
    })

    it('does not let a replacement skip the cooldown (RF-027, RF-030)', async () => {
      const { player, caseId } = await playerWithPrint('Swap1xx')
      await decide(caseId, { approve: true, archetype: 'maestro', gamertag: 'Swap1xx' })
      const replacement = await request(app.getHttpServer())
        .post('/api/characters')
        .set('Cookie', player.cookie)
        .send({
          category: 'midfielder',
          archetype: 'creator',
          platform: 'ps5',
          gamertag: 'Swap1xx',
        })

      const res = await resend(player.cookie, replacement.body.id)

      expect(res.status).toBe(429)
      expect(res.body.message).toBe('print_cooldown')
    })

    it('keeps one print in review when two arrive at once', async () => {
      const player = await account()
      const character = await request(app.getHttpServer())
        .post('/api/characters')
        .set('Cookie', player.cookie)
        .send({
          category: 'midfielder',
          archetype: 'maestro',
          platform: 'ps5',
          gamertag: 'Pair1xx',
        })

      const results = await Promise.all([
        resend(player.cookie, character.body.id),
        resend(player.cookie, character.body.id),
      ])

      expect(results.map((res) => res.status).sort()).toEqual([201, 409])
    })

    it('does not count a refused cooldown or review as an attempt (RF-065)', async () => {
      const { player, characterId } = await playerWithPrint('Count1x')
      await resend(player.cookie, characterId)
      await resend(player.cookie, characterId)

      const count = await orm.em.fork().count(PrintSubmission, { character: characterId })

      expect(count).toBe(1)
    })

    it('lets a rejected print be sent again right away (RF-030)', async () => {
      const { player, characterId, caseId } = await playerWithPrint('Retry1x')
      await decide(caseId, { approve: false, rejection: 'unreadable' })

      const res = await resend(player.cookie, characterId)

      expect(res.body.status).toBe('received')
    })
  })
})
