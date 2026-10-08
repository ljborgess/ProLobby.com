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
import { EloEventReason } from '../src/modules/ranking/ranking-event.enums'
import { CapturingMailSender } from './support/capturing-mail-sender'

/**
 * Phase 2.4, #207: category elo is 1000 plus unreverted events, with no
 * column. The match result (#209) is not built yet, so these tests write
 * events the way it will.
 */
describe('category elo from events (#207)', () => {
  let app: INestApplication
  let orm: MikroORM
  let elo: EloService
  let counter = 0

  const player = async (): Promise<{ accountId: string; characterId: string }> => {
    const email = `elo-${++counter}@test.local`
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

  const record = async (
    characterId: string,
    delta: number,
    reason: EloEventReason = EloEventReason.MATCH_RESULT,
    reverted = false,
  ) => {
    const em = orm.em.fork()
    const character = await em.findOneOrFail(Character, { id: characterId })
    em.create(EloEvent, {
      character,
      delta,
      reason,
      lobbyId: reason === EloEventReason.MATCH_RESULT ? randomUUID() : undefined,
      revertedAt: reverted ? new Date() : undefined,
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
    await orm.getSchemaGenerator().refreshDatabase()
    elo = moduleRef.get(EloService)
  }, 60_000)

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('starts at 1000 when the category has no events', async () => {
    const one = await player()

    await expect(
      elo.of(one.accountId, CharacterCategory.MIDFIELDER, CURRENT_EDITION),
    ).resolves.toBe(1000)
  })

  it('starts at 1000 when the account has no character in that category', async () => {
    const one = await player()

    await expect(elo.of(one.accountId, CharacterCategory.STRIKER, CURRENT_EDITION)).resolves.toBe(
      1000,
    )
  })

  it('adds every unreverted delta of the category', async () => {
    const one = await player()
    await record(one.characterId, 16)
    await record(one.characterId, -8)
    await record(one.characterId, -25, EloEventReason.INACTIVITY_DECAY)

    await expect(
      elo.of(one.accountId, CharacterCategory.MIDFIELDER, CURRENT_EDITION),
    ).resolves.toBe(983)
  })

  it('ignores reverted events, so an annulment goes back by itself (#210)', async () => {
    const one = await player()
    await record(one.characterId, 16)
    await record(one.characterId, -16, EloEventReason.MATCH_RESULT, true)

    await expect(
      elo.of(one.accountId, CharacterCategory.MIDFIELDER, CURRENT_EDITION),
    ).resolves.toBe(1016)
  })

  it('sums the inactive character too — a replacement inherits the rating (RF-027)', async () => {
    const one = await player()
    await record(one.characterId, 16)
    const em = orm.em.fork()
    const previous = await em.findOneOrFail(Character, { id: one.characterId })
    previous.state = CharacterState.INACTIVE
    await em.flush()
    const replacement = em.create(Character, {
      account: previous.account,
      category: previous.category,
      archetype: Archetype.CREATOR,
      platform: previous.platform,
      edition: previous.edition,
      matchesInCategory: previous.matchesInCategory,
    })
    await em.flush()
    await record(replacement.id, -8)

    await expect(
      elo.of(one.accountId, CharacterCategory.MIDFIELDER, CURRENT_EDITION),
    ).resolves.toBe(1008)
  })

  it('does not mix another category of the same account', async () => {
    const midfielder = await player()
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { id: midfielder.accountId })
    const striker = em.create(Character, {
      account,
      category: CharacterCategory.STRIKER,
      archetype: Archetype.FINISHER,
      platform: Platform.PS5,
      edition: CURRENT_EDITION,
      state: CharacterState.VERIFIED,
      verifiedAt: new Date(),
    })
    await em.flush()
    await record(midfielder.characterId, 16)
    await record(striker.id, -20)

    await expect(
      elo.of(midfielder.accountId, CharacterCategory.MIDFIELDER, CURRENT_EDITION),
    ).resolves.toBe(1016)
    await expect(
      elo.of(midfielder.accountId, CharacterCategory.STRIKER, CURRENT_EDITION),
    ).resolves.toBe(980)
  })

  it('does not mix another account in the same category', async () => {
    const a = await player()
    const b = await player()
    await record(a.characterId, 16)
    await record(b.characterId, -16)

    await expect(elo.of(a.accountId, CharacterCategory.MIDFIELDER, CURRENT_EDITION)).resolves.toBe(
      1016,
    )
    await expect(elo.of(b.accountId, CharacterCategory.MIDFIELDER, CURRENT_EDITION)).resolves.toBe(
      984,
    )
  })

  it('keeps no elo column on character — the number is derived', async () => {
    const columns = await orm.em.getConnection().execute<{ column_name: string }[]>(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'character'`,
    )
    expect(columns.map((row) => row.column_name)).not.toContain('elo')
    expect(orm.getMetadata().get('Character').properties.elo).toBeUndefined()
  })
})
