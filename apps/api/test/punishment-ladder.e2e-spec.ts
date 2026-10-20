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
import { PlatformGamertag } from '../src/modules/character/platform-gamertag.entity'
import { BlockedIdentity } from '../src/modules/moderation/blocked-identity.entity'
import { ModerationCase } from '../src/modules/moderation/moderation-case.entity'
import {
  ModerationCaseState,
  ModerationCaseType,
} from '../src/modules/moderation/moderation-case.enums'
import { QueueEntry } from '../src/modules/queue/queue-entry.entity'
import { ReputationEventReason } from '../src/modules/ranking/ranking-event.enums'
import { ReputationService } from '../src/modules/ranking/reputation.service'
import { CapturingMailSender } from './support/capturing-mail-sender'

const PASSWORD = 'a-long-enough-password'
const DAY = 24 * 60 * 60 * 1000

/** Phase 4.2: the punishment ladder — RF-038, RF-074, RF-079, #160. */
describe('punishment ladder (4.2)', () => {
  let app: INestApplication
  let orm: MikroORM
  let reputation: ReputationService
  let counter = 0

  const account = async (start: number) => {
    const email = `ladder-${++counter}@test.local`
    await request(app.getHttpServer()).post('/api/accounts').send({
      email,
      password: PASSWORD,
      birthDate: '1990-05-20',
      securityQuestion: 'Qual o nome do seu primeiro time?',
      securityAnswer: 'São Paulo',
      acceptedTermsVersion: CURRENT_TERMS_VERSION,
    })
    const em = orm.em.fork()
    const row = await em.findOneOrFail(Account, { email })
    row.reputation = start
    row.state = AccountState.ACTIVE
    row.emailVerified = true
    row.discordIdHash = randomUUID()
    await em.flush()
    return { id: row.id, email }
  }

  const reload = (id: string) => orm.em.fork().findOneOrFail(Account, { id })
  const casesOf = (id: string, type: ModerationCaseType) =>
    orm.em.fork().find(ModerationCase, { targetAccount: id, type })

  /** A searching queue entry: the punishment takes it away. */
  const searching = async (id: string) => {
    const em = orm.em.fork()
    const character = em.create(Character, {
      account: id,
      category: CharacterCategory.MIDFIELDER,
      archetype: Archetype.MAESTRO,
      platform: Platform.PS5,
      edition: CURRENT_EDITION,
      state: CharacterState.VERIFIED,
      verifiedAt: new Date(),
    })
    em.create(QueueEntry, {
      account: id,
      character,
      category: character.category,
      eloAtEntry: 1000,
    })
    await em.flush()
  }

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
    reputation = moduleRef.get(ReputationService)
  }, 60_000)

  beforeEach(async () => {
    await orm.getSchemaGenerator().refreshDatabase()
  })

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('crossing under 40 suspends for 7 days, with a resolved case, and takes the search away', async () => {
    const { id } = await account(42)
    await searching(id)
    const before = Date.now()

    await reputation.apply(id, ReputationEventReason.DISCONNECT)

    const row = await reload(id)
    expect(row.state).toBe(AccountState.SUSPENDED)
    expect(row.reputation).toBe(34)
    const ends = row.suspensionEndsAt!.getTime()
    expect(ends).toBeGreaterThanOrEqual(before + 7 * DAY)
    expect(ends).toBeLessThanOrEqual(Date.now() + 7 * DAY)
    const [suspension] = await casesOf(id, ModerationCaseType.SUSPENSION)
    expect(suspension).toMatchObject({ state: ModerationCaseState.RESOLVED })
    expect(await orm.em.fork().count(QueueEntry, { account: id })).toBe(0)
  })

  it('a low value alone punishes nothing: only the crossing does (RF-074)', async () => {
    // Inside the suspension band already, staying in it: 34 to 26.
    const { id } = await account(34)

    await reputation.apply(id, ReputationEventReason.DISCONNECT)

    expect((await reload(id)).state).toBe(AccountState.ACTIVE)
    expect(await casesOf(id, ModerationCaseType.SUSPENSION)).toHaveLength(0)
  })

  it('the served suspension comes back at 45 and active, and crosses nothing (RF-074)', async () => {
    const { id } = await account(42)
    await reputation.apply(id, ReputationEventReason.DISCONNECT)
    const ends = (await reload(id)).suspensionEndsAt!

    expect(await reputation.endSuspensions(new Date(ends.getTime() - 1))).toBe(0)
    expect(await reputation.endSuspensions(ends)).toBe(1)

    const row = await reload(id)
    expect(row).toMatchObject({ state: AccountState.ACTIVE, reputation: 45 })
    expect(row.suspensionEndsAt ?? null).toBeNull()
  })

  it('a second suspension in 180 days is a ban (RF-038), the identities are barred (RF-079)', async () => {
    const { id } = await account(42)
    const em = orm.em.fork()
    em.create(PlatformGamertag, {
      account: id,
      platform: Platform.PS5,
      gamertagHash: 'a'.repeat(64),
      gamertagEncrypted: Buffer.from('x'),
      verifiedAt: new Date(),
    })
    await em.flush()
    await reputation.apply(id, ReputationEventReason.DISCONNECT)
    await reputation.endSuspensions(new Date(Date.now() + 8 * DAY))

    // From 45, one disconnect crosses 40 again.
    await reputation.apply(id, ReputationEventReason.DISCONNECT)

    const row = await reload(id)
    expect(row.state).toBe(AccountState.BANNED)
    expect(row.suspensionEndsAt ?? null).toBeNull()
    const [ban] = await casesOf(id, ModerationCaseType.BAN)
    expect(ban!.decision).toContain('segunda suspensão')
    const blocked = await orm.em.fork().find(BlockedIdentity, { case: ban!.id })
    expect(blocked.map((b) => b.discordIdHash ?? b.gamertagHash).sort()).toEqual(
      [row.discordIdHash, 'a'.repeat(64)].sort(),
    )
  })

  it.each([
    ['dismissed on appeal', (c: ModerationCase) => (c.state = ModerationCaseState.DISMISSED)],
    ['older than 180 days', (c: ModerationCase) => (c.openedAt = new Date(Date.now() - 181 * DAY))],
  ])('a suspension %s does not count (RF-038)', async (_label, change) => {
    const { id } = await account(42)
    await reputation.apply(id, ReputationEventReason.DISCONNECT)
    await reputation.endSuspensions(new Date(Date.now() + 8 * DAY))
    const em = orm.em.fork()
    const [first] = await em.find(ModerationCase, {
      targetAccount: id,
      type: ModerationCaseType.SUSPENSION,
    })
    change(first!)
    await em.flush()

    await reputation.apply(id, ReputationEventReason.DISCONNECT)

    expect((await reload(id)).state).toBe(AccountState.SUSPENDED)
  })

  it('crossing under 25 bans at once', async () => {
    const { id } = await account(30)

    await reputation.apply(id, ReputationEventReason.DISCONNECT)

    expect((await reload(id)).state).toBe(AccountState.BANNED)
    expect(await casesOf(id, ModerationCaseType.BAN)).toHaveLength(1)
  })

  it('a suspended account appeals its suspension, once (#160, RF-037)', async () => {
    const { id, email } = await account(42)
    await reputation.apply(id, ReputationEventReason.DISCONNECT)
    const login = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ email, password: PASSWORD })
    const header = login.headers['set-cookie']
    const cookie = (Array.isArray(header) ? header : [header]).find((c) =>
      c?.startsWith(SESSION_COOKIE_NAME),
    )!
    const message = 'Caí por queda do jogo, não por abandono.'

    const first = await request(app.getHttpServer())
      .post('/api/accounts/me/punishment/appeals')
      .set('Cookie', cookie)
      .send({ message })
    expect(first.status).toBe(201)
    const appeal = await orm.em.fork().findOneOrFail(ModerationCase, { id: first.body.caseId })
    const [suspension] = await casesOf(id, ModerationCaseType.SUSPENSION)
    expect(appeal.appealsCase!.id).toBe(suspension!.id)

    const second = await request(app.getHttpServer())
      .post('/api/accounts/me/punishment/appeals')
      .set('Cookie', cookie)
      .send({ message })
    expect(second.status).toBe(409)
  })
})
