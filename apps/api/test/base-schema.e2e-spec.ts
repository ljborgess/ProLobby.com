import { EntityManager, MikroORM } from '@mikro-orm/postgresql'

import config from '../src/common/database/mikro-orm.config'
import { Account } from '../src/modules/account/account.entity'
import { PaymentEvent, PaymentEventType } from '../src/modules/account/payment-event.entity'
import { TermsAcceptance } from '../src/modules/account/terms-acceptance.entity'
import { BlockedIdentity } from '../src/modules/moderation/blocked-identity.entity'
import { ModerationCase } from '../src/modules/moderation/moderation-case.entity'
import {
  ModerationCaseOrigin,
  ModerationCaseState,
  ModerationCaseType,
} from '../src/modules/moderation/moderation-case.enums'
import { EloEvent } from '../src/modules/ranking/elo-event.entity'
import { ReputationEvent } from '../src/modules/ranking/reputation-event.entity'
import { EloEventReason, ReputationEventReason } from '../src/modules/ranking/ranking-event.enums'
import { Platform } from '../src/common/domain/platform.enum'

/**
 * Guards the properties of the base schema that rules elsewhere depend on —
 * the ones a future refactor could quietly drop.
 */
describe('base schema', () => {
  let orm: MikroORM

  const newAccount = (em: EntityManager, email: string) =>
    em.create(Account, {
      email,
      passwordHash: 'hash',
      birthDate: new Date('1990-01-01'),
      securityQuestion: 'question?',
      securityAnswerHash: 'hash',
    })

  beforeAll(async () => {
    orm = await MikroORM.init(config)
    await orm.getSchemaGenerator().refreshDatabase()
  }, 60_000)

  afterAll(async () => {
    await orm.close(true)
  })

  it('keeps every terms acceptance, instead of overwriting the previous one', async () => {
    const em = orm.em.fork()
    const account = newAccount(em, 'terms@test.local')
    em.persist(account)
    em.persist(em.create(TermsAcceptance, { account, version: '2026-01-01' }))
    em.persist(em.create(TermsAcceptance, { account, version: '2026-09-11' }))
    await em.flush()

    // Two rows, not one updated: which version was accepted and when is what
    // makes consent traceable (RF-026).
    await expect(em.count(TermsAcceptance, { account })).resolves.toBe(2)
  })

  it('marks a reverted reputation event instead of deleting it', async () => {
    const em = orm.em.fork()
    const account = newAccount(em, 'reverted@test.local')
    const event = em.create(ReputationEvent, {
      account,
      delta: -8,
      reason: ReputationEventReason.DISCONNECT,
    })
    em.persist(account)
    em.persist(event)
    await em.flush()

    event.revertedAt = new Date()
    await em.flush()

    // The row survives: erasing it would also erase the repeat-offence history
    // of someone who did nothing wrong.
    const stored = await em.findOneOrFail(ReputationEvent, { id: event.id })
    expect(stored.revertedAt).toBeInstanceOf(Date)
    expect(stored.delta).toBe(-8)
  })

  it('accepts an elo event for a character that has no table yet', async () => {
    const em = orm.em.fork()
    em.persist(
      em.create(EloEvent, {
        characterId: '11111111-1111-1111-1111-111111111111',
        delta: 20,
        reason: EloEventReason.MATCH_RESULT,
      }),
    )

    // No foreign key until phase 2.2 — the column is a plain uuid on purpose.
    await expect(em.flush()).resolves.toBeUndefined()
  })

  it('opens a system case with no author', async () => {
    const em = orm.em.fork()
    const moderationCase = em.create(ModerationCase, {
      type: ModerationCaseType.BOT_DELIVERY_FAILURE,
      origin: ModerationCaseOrigin.SYSTEM,
    })
    em.persist(moderationCase)
    await em.flush()

    // `openedBy` stays null: RF-068 counts reports per account, and automatic
    // cases must not count against anyone.
    expect(moderationCase.openedBy).toBeUndefined()
    expect(moderationCase.state).toBe(ModerationCaseState.OPEN)
  })

  it('refuses the same blocked gamertag twice on the same platform', async () => {
    const em = orm.em.fork()
    em.persist(
      em.create(BlockedIdentity, {
        gamertagHash: 'a'.repeat(64),
        platform: Platform.PS5,
        reason: 'proven fraud',
      }),
    )
    await em.flush()

    const other = orm.em.fork()
    other.persist(
      other.create(BlockedIdentity, {
        gamertagHash: 'a'.repeat(64),
        platform: Platform.PS5,
        reason: 'duplicate',
      }),
    )
    await expect(other.flush()).rejects.toThrow()

    // Same gamertag on another platform is another person: identity is the
    // pair (platform, gamertag), not the name alone.
    const another = orm.em.fork()
    another.persist(
      another.create(BlockedIdentity, {
        gamertagHash: 'a'.repeat(64),
        platform: Platform.XBOX_SERIES,
        reason: 'another platform',
      }),
    )
    await expect(another.flush()).resolves.toBeUndefined()
  })

  it('survives the account being deleted, because the ban is not on the account', async () => {
    const em = orm.em.fork()
    const account = newAccount(em, 'banned@test.local')
    em.persist(account)
    em.persist(
      em.create(BlockedIdentity, {
        discordIdHash: 'b'.repeat(64),
        reason: 'permanent ban',
      }),
    )
    await em.flush()

    await em.removeAndFlush(account)

    // This is the whole point of RF-079: asking for LGPD deletion right after
    // a ban used to be a clean way back in.
    await expect(em.count(BlockedIdentity, { discordIdHash: 'b'.repeat(64) })).resolves.toBe(1)
  })

  it('stores money as decimal, not float', async () => {
    const em = orm.em.fork()
    const account = newAccount(em, 'payment@test.local')
    em.persist(account)
    em.persist(
      em.create(PaymentEvent, { account, type: PaymentEventType.FOUNDER, amount: '49.00' }),
    )
    await em.flush()
    em.clear()

    const stored = await em.findOneOrFail(PaymentEvent, { account })
    // 49.00 comes back exactly — binary floating point would not guarantee it,
    // and this row is a fiscal record.
    expect(stored.amount).toBe('49.00')
  })
})
