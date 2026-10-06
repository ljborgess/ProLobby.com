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
import { Account } from '../src/modules/account/account.entity'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { Archetype, CharacterCategory } from '../src/modules/character/archetype'
import { Character, CharacterState } from '../src/modules/character/character.entity'
import { EloEvent } from '../src/modules/ranking/elo-event.entity'
import { EloDecayService } from '../src/modules/ranking/elo-decay.service'
import { EloService } from '../src/modules/ranking/elo.service'
import { EloEventReason } from '../src/modules/ranking/ranking-event.enums'
import { CapturingMailSender } from './support/capturing-mail-sender'

const DAY_MS = 24 * 60 * 60 * 1000
/** A fixed UTC "now", so every day count below is exact. */
const NOW = new Date('2026-12-01T04:00:00.000Z')
const daysBefore = (days: number) => new Date(NOW.getTime() - days * DAY_MS)
const daysAfter = (days: number) => new Date(NOW.getTime() + days * DAY_MS)

/**
 * Phase 2.4, #211 — RF-017. The match result (#209) is not built yet, so the
 * tests write its event the way it will: one `match_result` per character,
 * dated when the match ended.
 */
describe('inactivity decay (#211)', () => {
  let app: INestApplication
  let orm: MikroORM
  let decay: EloDecayService
  let elo: EloService
  let counter = 0

  const player = async (): Promise<{ accountId: string; characterId: string }> => {
    const email = `decay-${++counter}@test.local`
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
      category: CharacterCategory.STRIKER,
      archetype: Archetype.FINISHER,
      platform: Platform.PS5,
      edition: CURRENT_EDITION,
      state: CharacterState.VERIFIED,
      verifiedAt: daysBefore(400),
    })
    await em.flush()
    return { accountId: account.id, characterId: character.id }
  }

  /** A match result, as #209 will write it. */
  const played = async (
    characterId: string,
    at: Date,
    delta: number,
    reverted = false,
  ): Promise<void> => {
    const em = orm.em.fork()
    em.create(EloEvent, {
      character: em.getReference(Character, characterId),
      delta,
      reason: EloEventReason.MATCH_RESULT,
      lobbyId: randomUUID(),
      createdAt: at,
      revertedAt: reverted ? at : undefined,
    })
    await em.flush()
  }

  const eloOf = (accountId: string) => elo.of(accountId, CharacterCategory.STRIKER, CURRENT_EDITION)

  const cuts = (characterId: string) =>
    orm.em
      .fork()
      .count(EloEvent, { character: characterId, reason: EloEventReason.INACTIVITY_DECAY })

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
    decay = moduleRef.get(EloDecayService)
    elo = moduleRef.get(EloService)
  }, 60_000)

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('cuts nothing on day 89, once on day 90 and again on day 120', async () => {
    const one = await player()
    await played(one.characterId, daysBefore(89), 100)

    await decay.decay(NOW)
    expect(await eloOf(one.accountId)).toBe(1100)

    await decay.decay(daysAfter(1))
    expect(await eloOf(one.accountId)).toBe(1075)

    await decay.decay(daysAfter(31))
    expect(await eloOf(one.accountId)).toBe(1050)
  })

  it('catches up every cut owed when it runs late', async () => {
    const one = await player()
    await played(one.characterId, daysBefore(150), 200)

    await decay.decay(NOW)

    expect(await cuts(one.characterId)).toBe(3)
    expect(await eloOf(one.accountId)).toBe(1125)
  })

  it('stops at 1000, and never touches an elo below it', async () => {
    const above = await player()
    await played(above.characterId, daysBefore(200), 10)
    const below = await player()
    await played(below.characterId, daysBefore(200), -40)

    await decay.decay(NOW)

    expect(await eloOf(above.accountId)).toBe(1000)
    expect(await cuts(above.characterId)).toBe(1)
    expect(await eloOf(below.accountId)).toBe(960)
    expect(await cuts(below.characterId)).toBe(0)
  })

  it('starts counting again after a match, and gives nothing back', async () => {
    const one = await player()
    await played(one.characterId, daysBefore(100), 100)
    await decay.decay(daysBefore(5))
    expect(await eloOf(one.accountId)).toBe(1075)

    await played(one.characterId, daysBefore(1), 0)
    await decay.decay(NOW)

    expect(await eloOf(one.accountId)).toBe(1075)
    await decay.decay(daysAfter(88))
    expect(await eloOf(one.accountId)).toBe(1075)
    await decay.decay(daysAfter(89))
    expect(await eloOf(one.accountId)).toBe(1050)
  })

  it('cuts once per period however many times it runs that day', async () => {
    const one = await player()
    await played(one.characterId, daysBefore(95), 100)

    await decay.decay(NOW)
    await decay.decay(NOW)
    await decay.decay(new Date(NOW.getTime() + 60_000))

    expect(await cuts(one.characterId)).toBe(1)
  })

  it('does not count an annulled match as the last one (#210)', async () => {
    const one = await player()
    await played(one.characterId, daysBefore(100), 100)
    await played(one.characterId, daysBefore(10), 30, true)

    await decay.decay(NOW)

    expect(await cuts(one.characterId)).toBe(1)
    expect(await eloOf(one.accountId)).toBe(1075)
  })

  it('leaves alone a category that never played', async () => {
    const one = await player()

    expect(await decay.decay(NOW)).toBeGreaterThanOrEqual(0)
    expect(await cuts(one.characterId)).toBe(0)
  })
})
