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
import { Lobby, LobbyState } from '../src/modules/lobby/lobby.entity'
import { LobbyConfirmationService } from '../src/modules/queue/lobby-confirmation.service'
import { QueueEntry } from '../src/modules/queue/queue-entry.entity'
import { QueueMatchingService } from '../src/modules/queue/queue-matching.service'
import { QueueRefusal } from '../src/modules/queue/queue-refusal.entity'
import { EloEvent } from '../src/modules/ranking/elo-event.entity'
import { ReputationEvent } from '../src/modules/ranking/reputation-event.entity'
import { EloEventReason } from '../src/modules/ranking/ranking-event.enums'
import { CapturingMailSender } from './support/capturing-mail-sender'

const PASSWORD = 'a-long-enough-password'
const SECOND = 1000
const MINUTE = 60 * SECOND

const ARCHETYPE: Record<CharacterCategory, Archetype> = {
  [CharacterCategory.GOALKEEPER]: Archetype.SHOT_STOPPER,
  [CharacterCategory.DEFENDER]: Archetype.BOSS,
  [CharacterCategory.MIDFIELDER]: Archetype.MAESTRO,
  [CharacterCategory.WINGER]: Archetype.SPARK,
  [CharacterCategory.STRIKER]: Archetype.FINISHER,
}

interface Player {
  accountId: string
  characterId: string
  entryId: string
  cookie: string
}

/** Phase 2.5, #232: the 30 s confirmation and the progressive queue block. */
describe('lobby confirmation and queue block (#232)', () => {
  let app: INestApplication
  let orm: MikroORM
  let matching: QueueMatchingService
  let confirmation: LobbyConfirmationService
  let counter = 0

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  const queued = async (category: CharacterCategory, freeSlots?: number): Promise<Player> => {
    const email = `confirm-${++counter}@test.local`
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
    if (freeSlots !== undefined) {
      em.create(DeclaredClub, { account, freeSlots, clubName: 'Clube' })
    }
    await em.flush()
    const res = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ email, password: PASSWORD })
    return {
      accountId: account.id,
      characterId: character.id,
      entryId: entry.id,
      cookie: cookieOf(res),
    }
  }

  /** Eight placed in one lobby; returns them and the lobby's creation instant. */
  const placed = async (): Promise<{ players: Player[]; createdAt: Date }> => {
    const players = [
      await queued(CharacterCategory.MIDFIELDER, 10),
      await queued(CharacterCategory.MIDFIELDER, 10),
      await queued(CharacterCategory.GOALKEEPER),
      await queued(CharacterCategory.GOALKEEPER),
      await queued(CharacterCategory.DEFENDER),
      await queued(CharacterCategory.DEFENDER),
      await queued(CharacterCategory.STRIKER),
      await queued(CharacterCategory.STRIKER),
    ]
    expect(await matching.closeMatches()).toBe(1)
    const [lobby] = await orm.em.fork().find(Lobby, {})
    return { players, createdAt: lobby!.createdAt }
  }

  const answer = (player: Player, accept: boolean) =>
    request(app.getHttpServer())
      .put('/api/queue/confirmation')
      .set('Cookie', player.cookie)
      .send({ accept })
  const queueOf = (player: Player) =>
    request(app.getHttpServer()).get('/api/queue').set('Cookie', player.cookie)
  const minutesBlocked = async (player: Player): Promise<number | null> => {
    const { blockedUntil } = (await queueOf(player)).body
    return blockedUntil === null ? null : (new Date(blockedUntil).getTime() - Date.now()) / MINUTE
  }
  const refusal = (player: Player, minutesAgo: number) =>
    orm.em.fork().insert(QueueRefusal, {
      id: randomUUID(),
      account: player.accountId,
      lobbyId: randomUUID(),
      createdAt: new Date(Date.now() - minutesAgo * MINUTE),
    })

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
    matching = moduleRef.get(QueueMatchingService)
    confirmation = moduleRef.get(LobbyConfirmationService)
  }, 60_000)

  beforeEach(async () => {
    await orm.getSchemaGenerator().refreshDatabase()
  })

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('shows the placement, and all accepting moves the lobby to the captain wait', async () => {
    const { players } = await placed()
    const shown = (await queueOf(players[0]!)).body.entry.lobby
    expect(shown).toMatchObject({ state: 'waiting_players', confirmed: false })
    expect(shown.confirmBy).toEqual(expect.any(String))

    for (const player of players) {
      expect((await answer(player, true)).status).toBe(204)
    }

    const [lobby] = await orm.em.fork().find(Lobby, {})
    expect(lobby!.state).toBe(LobbyState.WAITING_CAPTAIN)
    expect((await queueOf(players[0]!)).body.entry.lobby).toMatchObject({ confirmed: true })
  })

  it('a refusal takes the refuser out with a 5 min block and sends the rest back searching', async () => {
    const { players } = await placed()
    const [refuser, ...rest] = players
    const before = await orm.em.fork().find(QueueEntry, {})

    expect((await answer(refuser!, false)).status).toBe(204)

    const em = orm.em.fork()
    expect(await em.count(Lobby, {})).toBe(0)
    expect(await em.count(QueueEntry, { account: refuser!.accountId })).toBe(0)
    expect(await em.count(QueueRefusal, { account: refuser!.accountId })).toBe(1)
    for (const player of rest) {
      const entry = await em.findOneOrFail(QueueEntry, { id: player.entryId })
      expect(entry.lobby).toBeNull()
      expect(entry.joinedAt).toEqual(before.find((e) => e.id === player.entryId)!.joinedAt)
    }

    const join = await request(app.getHttpServer())
      .post('/api/queue')
      .set('Cookie', refuser!.cookie)
      .send({ characterId: refuser!.characterId })
    expect(join.status).toBe(403)
    expect(join.body.message).toBe('queue_blocked')
    expect(join.body.retryAfterSeconds).toBeGreaterThan(290)
    expect(join.body.retryAfterSeconds).toBeLessThanOrEqual(300)
  })

  it('letting the 30 s run out weighs the same as refusing', async () => {
    const { players, createdAt } = await placed()
    const [silent, ...rest] = players
    for (const player of rest) await answer(player, true)

    expect(await confirmation.expire(new Date(createdAt.getTime() + 29 * SECOND))).toBe(0)
    expect(await confirmation.expire(new Date(createdAt.getTime() + 31 * SECOND))).toBe(1)

    const em = orm.em.fork()
    expect(await em.count(QueueEntry, { account: silent!.accountId })).toBe(0)
    expect(await em.count(QueueRefusal, {})).toBe(1)
    expect(await em.count(QueueEntry, { lobby: null })).toBe(7)
  })

  it('tells, before the answer, how long a refusal would block (#234)', async () => {
    const { players } = await placed()
    await refusal(players[0]!, 60)

    const shown = (await queueOf(players[0]!)).body.entry.lobby
    expect(shown.refusalBlockMinutes).toBe(15)
    expect((await queueOf(players[1]!)).body.entry.lobby.refusalBlockMinutes).toBe(5)

    await answer(players[1]!, true)
    expect((await queueOf(players[1]!)).body.entry.lobby.refusalBlockMinutes).toBeNull()
  })

  it('climbs the ladder: a 2nd refusal blocks 15 min', async () => {
    const { players } = await placed()
    await refusal(players[0]!, 60)

    await answer(players[0]!, false)

    expect(await minutesBlocked(players[0]!)).toBeCloseTo(15, 0)
  })

  it('starts over after 12 h without a refusal', async () => {
    const { players } = await placed()
    await refusal(players[0]!, 13 * 60 + 1)
    await refusal(players[0]!, 13 * 60)

    await answer(players[0]!, false)

    expect(await minutesBlocked(players[0]!)).toBeCloseTo(5, 0)
  })

  it('a completed match clears the block at once', async () => {
    const { players } = await placed()
    await answer(players[0]!, false)
    expect(await minutesBlocked(players[0]!)).toBeCloseTo(5, 0)

    await orm.em.fork().insert(EloEvent, {
      id: randomUUID(),
      character: players[0]!.characterId,
      delta: 10,
      reason: EloEventReason.MATCH_RESULT,
      createdAt: new Date(),
    })

    expect(await minutesBlocked(players[0]!)).toBeNull()
  })

  it('never writes a reputation event, however many refusals', async () => {
    const { players } = await placed()
    for (let i = 0; i < 5; i += 1) await refusal(players[0]!, 10 + i)

    await answer(players[0]!, false)

    expect(await orm.em.fork().count(ReputationEvent, {})).toBe(0)
  })

  it('a confirmation wins over a later refusal from another device', async () => {
    const { players } = await placed()
    await answer(players[0]!, true)

    expect((await answer(players[0]!, false)).status).toBe(204)

    expect(await orm.em.fork().count(Lobby, {})).toBe(1)
    expect(await orm.em.fork().count(QueueRefusal, {})).toBe(0)
  })

  it('refuses an answer after the 30 s, and with no lobby', async () => {
    const { players, createdAt } = await placed()

    await expect(
      confirmation.respond(
        players[0]!.accountId,
        true,
        new Date(createdAt.getTime() + 31 * SECOND),
      ),
    ).rejects.toMatchObject({ status: 409 })
    const outsider = await queued(CharacterCategory.WINGER)
    expect((await answer(outsider, true)).status).toBe(404)
  })
})
