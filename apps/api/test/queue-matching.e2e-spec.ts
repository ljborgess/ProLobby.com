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
import { DeclaredClub } from '../src/modules/account/declared-club.entity'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { Archetype, CharacterCategory } from '../src/modules/character/archetype'
import { Character, CharacterState } from '../src/modules/character/character.entity'
import { LobbyParticipation } from '../src/modules/lobby/lobby-participation.entity'
import { Lobby, LobbyState } from '../src/modules/lobby/lobby.entity'
import { QueueEntry } from '../src/modules/queue/queue-entry.entity'
import { QueueMatchingService } from '../src/modules/queue/queue-matching.service'
import { CapturingMailSender } from './support/capturing-mail-sender'

const PASSWORD = 'a-long-enough-password'

const ARCHETYPE: Record<CharacterCategory, Archetype> = {
  [CharacterCategory.GOALKEEPER]: Archetype.SHOT_STOPPER,
  [CharacterCategory.DEFENDER]: Archetype.BOSS,
  [CharacterCategory.MIDFIELDER]: Archetype.MAESTRO,
  [CharacterCategory.WINGER]: Archetype.SPARK,
  [CharacterCategory.STRIKER]: Archetype.FINISHER,
}

/** Phase 2.5, #231: the queue closes a match into a lobby, on the real database. */
describe('queue closes matches (#231)', () => {
  let app: INestApplication
  let orm: MikroORM
  let matching: QueueMatchingService
  let counter = 0

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  /** An account meeting every prerequisite, searching with one verified character. */
  const queued = async (
    category: CharacterCategory,
    freeSlots: number | null = null,
  ): Promise<{ accountId: string; entryId: string; cookie: string }> => {
    const email = `matching-${++counter}@test.local`
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
    account.discordIdHash = randomUUID()
    const character = em.create(Character, {
      account,
      category,
      archetype: ARCHETYPE[category],
      platform: Platform.PS5,
      edition: CURRENT_EDITION,
      state: CharacterState.VERIFIED,
      verifiedAt: new Date(),
    })
    const entry = em.create(QueueEntry, { account, character, category, eloAtEntry: 1000 })
    if (freeSlots !== null) {
      em.create(DeclaredClub, { account, freeSlots, clubName: 'Clube' })
    }
    await em.flush()
    const res = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ email, password: PASSWORD })
    return { accountId: account.id, entryId: entry.id, cookie: cookieOf(res) }
  }

  /** Four pairs with a captain on each side: the smallest lobby that closes. */
  const eight = async () => [
    await queued(CharacterCategory.MIDFIELDER, 10),
    await queued(CharacterCategory.MIDFIELDER, 10),
    await queued(CharacterCategory.GOALKEEPER),
    await queued(CharacterCategory.GOALKEEPER),
    await queued(CharacterCategory.DEFENDER),
    await queued(CharacterCategory.DEFENDER),
    await queued(CharacterCategory.STRIKER),
    await queued(CharacterCategory.STRIKER),
  ]

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
    matching = moduleRef.get(QueueMatchingService)
  }, 60_000)

  beforeEach(async () => {
    await orm.getSchemaGenerator().refreshDatabase()
  })

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('creates one lobby with 8 participations and takes the 8 out of the search', async () => {
    const players = await eight()

    expect(await matching.closeMatches()).toBe(1)

    const em = orm.em.fork()
    const [lobby] = await em.find(Lobby, {})
    expect(lobby!.state).toBe(LobbyState.WAITING_PLAYERS)
    const participations = await em.find(LobbyParticipation, { lobby: lobby! })
    expect(participations).toHaveLength(8)
    expect(participations.filter((p) => p.side === 'a')).toHaveLength(4)
    expect(new Set(participations.map((p) => p.account.id))).toEqual(
      new Set(players.map((p) => p.accountId)),
    )
    expect(await em.count(QueueEntry, { lobby: null })).toBe(0)
    expect(await matching.closeMatches()).toBe(0)
  })

  it('makes a single lobby out of two runs at once', async () => {
    await eight()

    const runs = await Promise.all([matching.closeMatches(), matching.closeMatches()])

    expect(runs[0]! + runs[1]!).toBe(1)
    expect(await orm.em.fork().count(Lobby, {})).toBe(1)
    expect(await orm.em.fork().count(LobbyParticipation, {})).toBe(8)
  })

  it('leaves the excess searching with its original joinedAt', async () => {
    await eight()
    const lone = await queued(CharacterCategory.WINGER)
    const before = await orm.em.fork().findOneOrFail(QueueEntry, { id: lone.entryId })

    expect(await matching.closeMatches()).toBe(1)

    const after = await orm.em.fork().findOneOrFail(QueueEntry, { id: lone.entryId })
    expect(after.lobby).toBeNull()
    expect(after.joinedAt).toEqual(before.joinedAt)
  })

  it('does not place an account suspended after joining', async () => {
    const players = await eight()
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { id: players[2]!.accountId })
    account.state = AccountState.SUSPENDED
    await em.flush()

    expect(await matching.closeMatches()).toBe(0)
    expect(await orm.em.fork().count(QueueEntry, { lobby: null })).toBe(8)
  })

  it('refuses leaving once placed: the way out is refusing the lobby (#232)', async () => {
    const [first] = await eight()
    await matching.closeMatches()

    const res = await request(app.getHttpServer()).delete('/api/queue').set('Cookie', first!.cookie)

    expect(res.status).toBe(409)
    expect(res.body.message).toBe('queue_entry_in_lobby')
  })
})
