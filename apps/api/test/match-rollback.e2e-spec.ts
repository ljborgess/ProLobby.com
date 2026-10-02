import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes, randomUUID } from 'node:crypto'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { CURRENT_EDITION } from '../src/common/domain/game-edition.enum'
import { MailSender } from '../src/common/mail/mail.types'
import { applySecurity } from '../src/common/security/security.config'
import { Account } from '../src/modules/account/account.entity'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { Platform } from '../src/common/domain/platform.enum'
import { Archetype, CharacterCategory } from '../src/modules/character/archetype'
import { Character, CharacterState } from '../src/modules/character/character.entity'
import { EloEvent } from '../src/modules/ranking/elo-event.entity'
import { EloService } from '../src/modules/ranking/elo.service'
import { MatchRollbackService } from '../src/modules/ranking/match-rollback.service'
import { EloEventReason, ReputationEventReason } from '../src/modules/ranking/ranking-event.enums'
import { ReputationService } from '../src/modules/ranking/reputation.service'
import { CapturingMailSender } from './support/capturing-mail-sender'

/**
 * Phase 2.4, #210. The match result (#209) is not built yet, so these tests
 * write its events the way it will: one `match_result` per character with the
 * lobby id, and `matchesInCategory` up by one on the category's active
 * character.
 */
describe('match rollback (#210)', () => {
  let app: INestApplication
  let orm: MikroORM
  let rollback: MatchRollbackService
  let reputation: ReputationService
  let elo: EloService
  let counter = 0

  const player = async (): Promise<{ accountId: string; characterId: string }> => {
    const email = `rollback-${++counter}@test.local`
    await request(app.getHttpServer()).post('/api/accounts').send({
      email,
      password: 'a-long-enough-password',
      birthDate: '1990-05-20',
      securityQuestion: 'Qual o nome do seu primeiro time?',
      securityAnswer: 'São Paulo',
      acceptedTermsVersion: CURRENT_TERMS_VERSION,
    })
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    const character = em.create(Character, {
      account,
      category: CharacterCategory.MIDFIELDER,
      archetype: Archetype.MAESTRO,
      platform: Platform.PS5,
      edition: CURRENT_EDITION,
      state: CharacterState.VERIFIED,
      verifiedAt: new Date(),
    })
    await em.flush()
    return { accountId: account.id, characterId: character.id }
  }

  /** What #209 will write for one character in one lobby. */
  const played = async (characterId: string, lobbyId: string, delta: number) => {
    const em = orm.em.fork()
    const character = await em.findOneOrFail(Character, { id: characterId })
    em.create(EloEvent, { character, delta, reason: EloEventReason.MATCH_RESULT, lobbyId })
    character.matchesInCategory += 1
    await em.flush()
  }

  const state = async (accountId: string, characterId: string) => {
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { id: accountId })
    const character = await em.findOneOrFail(Character, { id: characterId })
    return {
      reputation: account.reputation,
      matches: character.matchesInCategory,
      elo: await elo.ofIn(em, accountId, character.category, character.edition),
    }
  }

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
    rollback = moduleRef.get(MatchRollbackService)
    reputation = moduleRef.get(ReputationService)
    elo = moduleRef.get(EloService)
  }, 60_000)

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('puts elo, reputation and the match count back as they were', async () => {
    const winner = await player()
    const loser = await player()
    // Below 70 through the log, the only way the replay knows about it.
    await reputation.apply(loser.accountId, ReputationEventReason.DISCONNECT, randomUUID())
    const before = [
      await state(winner.accountId, winner.characterId),
      await state(loser.accountId, loser.characterId),
    ]
    const lobbyId = randomUUID()
    await played(winner.characterId, lobbyId, 16)
    await played(loser.characterId, lobbyId, -16)
    await reputation.apply(loser.accountId, ReputationEventReason.CLEAN_MATCH, lobbyId)
    await reputation.apply(winner.accountId, ReputationEventReason.DISCONNECT, lobbyId)

    const result = await rollback.revertLobby(lobbyId)

    expect(result).toEqual({ eloEvents: 2, reputationEvents: 2 })
    expect(await state(winner.accountId, winner.characterId)).toEqual(before[0])
    expect(await state(loser.accountId, loser.characterId)).toEqual(before[1])
  })

  it('keeps every event, marked, and writes no new reputation event (RF-044)', async () => {
    const one = await player()
    const lobbyId = randomUUID()
    await played(one.characterId, lobbyId, 16)
    await reputation.apply(one.accountId, ReputationEventReason.DISCONNECT, lobbyId)

    await rollback.revertLobby(lobbyId)

    const em = orm.em.fork()
    const elo = await em.find(EloEvent, { lobbyId })
    const { ReputationEvent } = await import('../src/modules/ranking/reputation-event.entity')
    const rep = await em.find(ReputationEvent, { account: one.accountId })
    expect(elo).toHaveLength(1)
    expect(elo[0]!.revertedAt).toBeInstanceOf(Date)
    expect(rep).toHaveLength(1)
    expect(rep[0]!.revertedAt).toBeInstanceOf(Date)
  })

  it('does nothing the second time', async () => {
    const one = await player()
    const lobbyId = randomUUID()
    await played(one.characterId, lobbyId, 16)
    await rollback.revertLobby(lobbyId)
    const after = await state(one.accountId, one.characterId)

    expect(await rollback.revertLobby(lobbyId)).toEqual({ eloEvents: 0, reputationEvents: 0 })
    expect(await state(one.accountId, one.characterId)).toEqual(after)
  })

  it('reverts once when two rollbacks of the same lobby arrive together', async () => {
    const one = await player()
    const lobbyId = randomUUID()
    await played(one.characterId, lobbyId, 16)

    const results = await Promise.all([
      rollback.revertLobby(lobbyId),
      rollback.revertLobby(lobbyId),
    ])

    expect(results.map((r) => r.eloEvents).sort()).toEqual([0, 1])
    expect((await state(one.accountId, one.characterId)).matches).toBe(0)
  })

  it('leaves other lobbies and the inactivity decay alone', async () => {
    const one = await player()
    const annulled = randomUUID()
    const kept = randomUUID()
    await played(one.characterId, kept, 16)
    await played(one.characterId, annulled, -16)
    const em = orm.em.fork()
    em.create(EloEvent, {
      character: em.getReference(Character, one.characterId),
      delta: -25,
      reason: EloEventReason.INACTIVITY_DECAY,
    })
    await em.flush()

    await rollback.revertLobby(annulled)

    expect(await state(one.accountId, one.characterId)).toMatchObject({ elo: 991, matches: 1 })
  })

  /** Replaces the active character of the category, as creation does (RF-027). */
  const replace = async (characterId: string): Promise<string> => {
    const em = orm.em.fork()
    const old = await em.findOneOrFail(Character, { id: characterId })
    old.state = CharacterState.INACTIVE
    await em.flush()
    const replacement = em.create(Character, {
      account: old.account,
      category: old.category,
      archetype: Archetype.CREATOR,
      platform: old.platform,
      edition: old.edition,
      matchesInCategory: old.matchesInCategory,
    })
    await em.flush()
    return replacement.id
  }

  it('takes the match from the active character, which inherited it (RF-027)', async () => {
    const one = await player()
    const lobbyId = randomUUID()
    await played(one.characterId, lobbyId, 16)
    const second = await replace(one.characterId)
    const third = await replace(second)

    await rollback.revertLobby(lobbyId)

    expect((await state(one.accountId, third)).matches).toBe(0)
    // The replaced ones are history: they keep the count they had.
    expect((await state(one.accountId, second)).matches).toBe(1)
    expect((await state(one.accountId, one.characterId)).matches).toBe(1)
  })

  it('replays reputation, so an annulled disconnect does not lift it past 70', async () => {
    const one = await player()
    const lobbyId = randomUUID()
    await reputation.apply(one.accountId, ReputationEventReason.DISCONNECT, lobbyId)
    for (let i = 0; i < 8; i += 1) {
      await reputation.apply(one.accountId, ReputationEventReason.CLEAN_MATCH, randomUUID())
    }

    await rollback.revertLobby(lobbyId)

    expect((await state(one.accountId, one.characterId)).reputation).toBe(70)
  })

  it('replays reputation, so an annulled clean match at 69 is made up by the next one', async () => {
    const one = await player()
    await reputation.apply(one.accountId, ReputationEventReason.DISCONNECT, randomUUID())
    for (let i = 0; i < 7; i += 1) {
      await reputation.apply(one.accountId, ReputationEventReason.CLEAN_MATCH, randomUUID())
    }
    const lobbyId = randomUUID()
    await reputation.apply(one.accountId, ReputationEventReason.CLEAN_MATCH, lobbyId)
    await reputation.apply(one.accountId, ReputationEventReason.CLEAN_MATCH, randomUUID())

    await rollback.revertLobby(lobbyId)

    expect((await state(one.accountId, one.characterId)).reputation).toBe(70)
  })

  it('replays a served suspension as "back to 45", whatever it follows', async () => {
    const one = await player()
    for (let i = 0; i < 3; i += 1) {
      await reputation.apply(one.accountId, ReputationEventReason.DISCONNECT, randomUUID())
    }
    const lobbyId = randomUUID()
    await reputation.apply(one.accountId, ReputationEventReason.DISCONNECT, lobbyId)
    await reputation.apply(one.accountId, ReputationEventReason.SUSPENSION_SERVED)

    await rollback.revertLobby(lobbyId)

    expect((await state(one.accountId, one.characterId)).reputation).toBe(45)
  })

  it('reverts two lobbies that share accounts at the same time, without deadlock', async () => {
    const a = await player()
    const b = await player()
    const first = randomUUID()
    const second = randomUUID()
    for (const lobby of [first, second]) {
      await played(a.characterId, lobby, 16)
      await played(b.characterId, lobby, -16)
      await reputation.apply(a.accountId, ReputationEventReason.DISCONNECT, lobby)
      await reputation.apply(b.accountId, ReputationEventReason.DISCONNECT, lobby)
    }

    await Promise.all([rollback.revertLobby(first), rollback.revertLobby(second)])

    expect(await state(a.accountId, a.characterId)).toEqual({
      reputation: 70,
      matches: 0,
      elo: 1000,
    })
    expect(await state(b.accountId, b.characterId)).toEqual({
      reputation: 70,
      matches: 0,
      elo: 1000,
    })
  })
})
