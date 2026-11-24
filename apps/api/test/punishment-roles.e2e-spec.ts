import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes, randomUUID } from 'node:crypto'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { MailSender } from '../src/common/mail/mail.types'
import {
  encryptAtRest,
  readEvidenceEncryptionKey,
} from '../src/common/security/evidence-encryption'
import { applySecurity } from '../src/common/security/security.config'
import { Account } from '../src/modules/account/account.entity'
import { AccountPlan, AccountState } from '../src/modules/account/account.enums'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { EventDelivery } from '../src/modules/bot-integration/event-delivery.entity'
import { EventDeliveryService } from '../src/modules/bot-integration/event-delivery.service'
import { AuditAction, AuditEntry } from '../src/modules/moderation/audit-entry.entity'
import { ReputationEventReason } from '../src/modules/ranking/ranking-event.enums'
import { ReputationService } from '../src/modules/ranking/reputation.service'
import { CapturingMailSender } from './support/capturing-mail-sender'
import { CURRENT_EDITION } from '../src/common/domain/game-edition.enum'
import { Platform } from '../src/common/domain/platform.enum'
import { Archetype, CharacterCategory } from '../src/modules/character/archetype'
import { Character, CharacterState } from '../src/modules/character/character.entity'

/** #324, RF-055: the bot hears about each punishment, only after the commit. */
describe('punishment roles (#324)', () => {
  let app: INestApplication
  let orm: MikroORM
  let reputation: ReputationService
  let events: EventDeliveryService
  let counter = 0

  const discordOf = (n: number) => `2${String(n).padStart(17, '0')}`

  const account = async (start: number, plan = AccountPlan.NONE) => {
    const email = `roles-${++counter}@test.local`
    await request(app.getHttpServer()).post('/api/accounts').send({
      email,
      password: 'a-long-enough-password',
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
    row.plan = plan
    row.discordIdHash = randomUUID()
    row.discordIdEncrypted = encryptAtRest(
      readEvidenceEncryptionKey(),
      Buffer.from(discordOf(counter)),
    )
    await em.flush()
    return { id: row.id, discord: discordOf(counter) }
  }

  /** The announcement leaves after the commit, without the caller awaiting it. */
  const punishedEvents = async (accountId: string, expected: number) => {
    let found: Record<string, unknown>[] = []
    for (let i = 0; i < 50; i++) {
      const rows = await orm.em
        .fork()
        .find(
          EventDelivery,
          { targetId: accountId, type: 'account.punished' },
          { orderBy: { createdAt: 'asc' } },
        )
      found = rows.map((row) => events.payloadOf(row))
      if (rows.length >= expected) return found
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    return found
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
    events = moduleRef.get(EventDeliveryService)
    await orm.getSchemaGenerator().refreshDatabase()
  }, 60_000)

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  /** Verificado comes back at the end of a suspension only to someone verified. */
  const verify = async (accountId: string) => {
    const em = orm.em.fork()
    em.create(Character, {
      account: accountId,
      category: CharacterCategory.MIDFIELDER,
      archetype: Archetype.MAESTRO,
      platform: Platform.PS5,
      edition: CURRENT_EDITION,
      state: CharacterState.VERIFIED,
      verifiedAt: new Date(),
    })
    await em.flush()
  }

  it('suspension and its end each tell the bot, with the Discord id', async () => {
    const player = await account(42)
    await verify(player.id)

    await reputation.apply(player.id, ReputationEventReason.DISCONNECT)
    const ends = (await orm.em.fork().findOneOrFail(Account, { id: player.id })).suspensionEndsAt!
    await reputation.endSuspensions(ends)

    expect(await punishedEvents(player.id, 2)).toEqual([
      { discordId: player.discord, kind: 'suspension' },
      { discordId: player.discord, kind: 'suspension_ended' },
    ])
  })

  it('the end of a suspension gives nothing back to someone never verified', async () => {
    const player = await account(42)

    await reputation.apply(player.id, ReputationEventReason.DISCONNECT)
    const ends = (await orm.em.fork().findOneOrFail(Account, { id: player.id })).suspensionEndsAt!
    await reputation.endSuspensions(ends)

    expect(await punishedEvents(player.id, 2)).toEqual([
      { discordId: player.discord, kind: 'suspension' },
    ])
  })

  it('a ban tells the bot and takes the plan away, audited', async () => {
    const player = await account(27, AccountPlan.FOUNDER)

    // Giving the plan in the setup already sent one; the ban must add none.
    const planEvents = () =>
      orm.em.fork().count(EventDelivery, { targetId: player.id, type: 'account.plan_changed' })
    const before = await planEvents()

    // 27 minus a disconnect crosses 25: ban.
    await reputation.apply(player.id, ReputationEventReason.DISCONNECT)

    const row = await orm.em.fork().findOneOrFail(Account, { id: player.id })
    expect(row).toMatchObject({ state: AccountState.BANNED, plan: AccountPlan.NONE })
    expect(await punishedEvents(player.id, 1)).toEqual([{ discordId: player.discord, kind: 'ban' }])
    // The ban takes the plan roles itself: no second event for the plan it zeroes.
    expect(await planEvents()).toBe(before)
    const [audit] = await orm.em
      .fork()
      .find(AuditEntry, { action: AuditAction.PLAN_CHANGED, targetAccountId: player.id })
    expect(audit).toMatchObject({
      actorLabel: 'system',
      before: { plan: 'founder' },
      after: { plan: 'none' },
    })
  })

  it('a punishment rolled back tells nobody', async () => {
    const player = await account(42)

    await expect(
      orm.em.fork().transactional(async (em) => {
        const row = await em.findOneOrFail(Account, { id: player.id })
        row.state = AccountState.SUSPENDED
        await em.flush()
        throw new Error('rolled back')
      }),
    ).rejects.toThrow('rolled back')

    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(await punishedEvents(player.id, 1)).toEqual([])
  })

  it('an account without Discord linked sends nothing', async () => {
    const player = await account(42)
    const em = orm.em.fork()
    const row = await em.findOneOrFail(Account, { id: player.id })
    row.discordIdEncrypted = undefined
    await em.flush()

    await reputation.apply(player.id, ReputationEventReason.DISCONNECT)

    expect(await punishedEvents(player.id, 1)).toEqual([])
  })
})
