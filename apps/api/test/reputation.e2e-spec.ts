import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes, randomUUID } from 'node:crypto'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { MailSender } from '../src/common/mail/mail.types'
import { applySecurity } from '../src/common/security/security.config'
import { Account } from '../src/modules/account/account.entity'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { ReputationEventReason } from '../src/modules/ranking/ranking-event.enums'
import { ReputationEvent } from '../src/modules/ranking/reputation-event.entity'
import { ReputationService } from '../src/modules/ranking/reputation.service'
import { CapturingMailSender } from './support/capturing-mail-sender'

/** Phase 2.4, #208: reputation moves only through its event log. */
describe('reputation by events (#208)', () => {
  let app: INestApplication
  let orm: MikroORM
  let reputation: ReputationService
  let counter = 0

  const account = async (start?: number): Promise<string> => {
    const email = `reputation-${++counter}@test.local`
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
    if (start !== undefined) {
      row.reputation = start
      await em.flush()
    }
    return row.id
  }

  const stored = async (id: string) => {
    const em = orm.em.fork()
    const row = await em.findOneOrFail(Account, { id })
    const events = await em.find(ReputationEvent, { account: id })
    return { reputation: row.reputation, events }
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
    reputation = moduleRef.get(ReputationService)
  }, 60_000)

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('records a disconnect as an event and moves the column with it', async () => {
    const id = await account()

    const change = await reputation.apply(id, ReputationEventReason.DISCONNECT, randomUUID())

    expect(change).toEqual({ reputation: 62, band: 'good', crossed: null })
    const { reputation: value, events } = await stored(id)
    expect(value).toBe(62)
    expect(events.map((event) => [event.reason, event.delta])).toEqual([['disconnect', -8]])
  })

  it('recovers by clean matches up to 70 and writes nothing past it', async () => {
    const id = await account(69)

    await reputation.apply(id, ReputationEventReason.CLEAN_MATCH)
    const atCap = await reputation.apply(id, ReputationEventReason.CLEAN_MATCH)

    expect(atCap.reputation).toBe(70)
    const { events } = await stored(id)
    expect(events).toHaveLength(1)
  })

  it('keeps the column equal to 70 plus the events, whatever the order', async () => {
    const id = await account()
    const reasons = [
      ReputationEventReason.DISCONNECT,
      ReputationEventReason.DISCONNECT,
      ReputationEventReason.CLEAN_MATCH,
      ReputationEventReason.DISCONNECT,
      ReputationEventReason.SUSPENSION_SERVED,
      ReputationEventReason.CLEAN_MATCH,
    ] as const
    for (const reason of reasons) {
      await reputation.apply(id, reason)
    }

    const { reputation: value, events } = await stored(id)
    expect(value).toBe(70 + events.reduce((sum, event) => sum + event.delta, 0))
    expect(value).toBe(46)
  })

  it('never goes below zero', async () => {
    const id = await account(3)

    const change = await reputation.apply(id, ReputationEventReason.DISCONNECT)

    expect(change.reputation).toBe(0)
    expect((await stored(id)).events[0]!.delta).toBe(-3)
  })

  it('says which band was entered, down and back up', async () => {
    const id = await account(58)

    const down = await reputation.apply(id, ReputationEventReason.DISCONNECT)
    const up = await reputation.apply(id, ReputationEventReason.SUSPENSION_SERVED)

    expect(down).toEqual({ reputation: 50, band: 'slow_queue', crossed: 'slow_queue' })
    expect(up).toEqual({ reputation: 45, band: 'slow_queue', crossed: null })
    const deeper = await account(41)
    expect((await reputation.apply(deeper, ReputationEventReason.DISCONNECT)).crossed).toBe(
      'suspension',
    )
  })

  it('loses no update when results for one account arrive at once', async () => {
    const id = await account(60)

    await Promise.all(
      Array.from({ length: 12 }, () => reputation.apply(id, ReputationEventReason.CLEAN_MATCH)),
    )

    const { reputation: value, events } = await stored(id)
    expect(value).toBe(70)
    expect(events).toHaveLength(10)
  })
})
