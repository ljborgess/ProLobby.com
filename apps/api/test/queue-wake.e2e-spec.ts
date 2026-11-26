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
import { Lobby, LobbyState } from '../src/modules/lobby/lobby.entity'
import {
  CONFIRMATION_WINDOW_MS,
  CONTEST_WINDOW_MS,
  ZERO_REPORT_MS,
} from '../src/modules/queue/match-report.service'
import { QueueEntry } from '../src/modules/queue/queue-entry.entity'
import { nextQueueWork, QueueWake } from '../src/modules/queue/queue-wake'
import { CapturingMailSender } from './support/capturing-mail-sender'

const PASSWORD = 'a-long-enough-password'
const HOUR = 60 * 60 * 1000

/** #333: the queue job sleeps when there is nothing to do, so Neon can hibernate. */
describe('queue job sleeps when idle (#333)', () => {
  let app: INestApplication
  let orm: MikroORM
  let wake: QueueWake
  let counter = 0
  const now = new Date('2026-11-26T12:00:00Z')

  const next = () => nextQueueWork(orm.em.fork(), now)
  const lobby = async (data: Partial<Lobby>) => {
    const em = orm.em.fork()
    em.create(Lobby, data as Lobby)
    await em.flush()
  }

  /** An account that can search, with a session; `searching` puts it in the queue. */
  const player = async (searching: boolean) => {
    const email = `wake-${++counter}@test.local`
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
      category: CharacterCategory.MIDFIELDER,
      archetype: Archetype.MAESTRO,
      platform: Platform.PS5,
      edition: CURRENT_EDITION,
      state: CharacterState.VERIFIED,
      verifiedAt: new Date(),
    })
    if (searching) {
      em.create(QueueEntry, {
        account,
        character,
        category: CharacterCategory.MIDFIELDER,
        eloAtEntry: 1000,
      })
    }
    await em.flush()
    const res = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ email, password: PASSWORD })
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
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
    wake = moduleRef.get(QueueWake)
  }, 60_000)

  beforeEach(async () => {
    await orm.getSchemaGenerator().refreshDatabase()
  })

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('has nothing to do with no one searching and no lobby open', async () => {
    await lobby({ state: LobbyState.FINISHED, endedAt: now })
    await lobby({ state: LobbyState.IN_DISPUTE })
    expect(await next()).toBeNull()
  })

  it('runs every tick while someone searches', async () => {
    await player(true)
    expect(await next()).toEqual(now)
  })

  it.each([LobbyState.WAITING_PLAYERS, LobbyState.WAITING_CAPTAIN, LobbyState.WAITING_INVITE])(
    'runs every tick while a lobby is in %s',
    async (state) => {
      await lobby({ state })
      expect(await next()).toEqual(now)
    },
  )

  it('runs every tick while a formation vote is open, not once the lobby ended', async () => {
    await lobby({ state: LobbyState.FINISHED, formationVoteStartedAt: now, endedAt: now })
    expect(await next()).toBeNull()
    await lobby({ state: LobbyState.IN_PROGRESS, formationVoteStartedAt: now, closedAt: now })
    expect(await next()).toEqual(now)
  })

  it('sleeps until the earliest long result deadline', async () => {
    const closed = new Date(now.getTime() - 10 * 60 * 1000)
    const reported = new Date(now.getTime() - 5 * 60 * 1000)
    const unconfirmed = new Date(now.getTime() - 47 * HOUR)
    await lobby({ state: LobbyState.IN_PROGRESS, closedAt: closed })
    expect(await next()).toEqual(new Date(closed.getTime() + ZERO_REPORT_MS))

    await lobby({ state: LobbyState.NOT_CONFIRMED, unconfirmedAt: unconfirmed })
    expect(await next()).toEqual(new Date(closed.getTime() + ZERO_REPORT_MS))

    await lobby({ state: LobbyState.AWAITING_CONFIRMATION, firstReportAt: reported })
    expect(await next()).toEqual(new Date(reported.getTime() + CONFIRMATION_WINDOW_MS))
    expect(CONTEST_WINDOW_MS).toBeGreaterThan(HOUR)
  })

  it('wakes on a call to the queue routes', async () => {
    const cookie = await player(false)
    wake.sleepUntil(null, 6 * HOUR)
    expect(wake.due()).toBe(false)

    const res = await request(app.getHttpServer()).get('/api/queue').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(wake.due()).toBe(true)
  })
})
