import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes } from 'node:crypto'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { MailSender } from '../src/common/mail/mail.types'
import {
  encryptAtRest,
  readEvidenceEncryptionKey,
} from '../src/common/security/evidence-encryption'
import { hashIdentity, readIdentityHmacSecret } from '../src/common/security/identity-hmac'
import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME } from '../src/common/security/session-cookie'
import { Account } from '../src/modules/account/account.entity'
import { AccountPlan, AccountRole, AccountState } from '../src/modules/account/account.enums'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { EventDelivery } from '../src/modules/bot-integration/event-delivery.entity'
import { EventDeliveryService } from '../src/modules/bot-integration/event-delivery.service'
import { AuditAction, AuditEntry } from '../src/modules/moderation/audit-entry.entity'
import { PlanService, SUPPORTER_MONTH_MS } from '../src/modules/moderation/plan.service'
import { PaymentEvent } from '../src/modules/account/payment-event.entity'
import { AccountRoleAnnouncer } from '../src/modules/bot-integration/account-role-announcer'
import { CapturingMailSender } from './support/capturing-mail-sender'

const PASSWORD = 'a-long-enough-password'

/** Founder and Supporter set from the panel — #313. */
describe('plan activation (#313)', () => {
  let app: INestApplication
  let orm: MikroORM
  let counter = 0
  let moderator: { id: string; cookie: string }

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  const discordOf = (n: number) => `1${String(n).padStart(17, '0')}`

  const account = async (role = AccountRole.USER) => {
    const email = `plans-${++counter}@test.local`
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
    row.role = role
    row.emailVerified = true
    row.state = AccountState.ACTIVE
    row.discordIdHash = hashIdentity(readIdentityHmacSecret(), discordOf(counter))
    row.discordIdEncrypted = encryptAtRest(
      readEvidenceEncryptionKey(),
      Buffer.from(discordOf(counter)),
    )
    await em.flush()
    const res = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ email, password: PASSWORD })
    return { id: row.id, email, discord: discordOf(counter), cookie: cookieOf(res) }
  }

  let admin: { id: string; cookie: string }
  let plans: () => PlanService
  let roles: () => AccountRoleAnnouncer
  let moduleEvents: () => EventDeliveryService
  const setPlan = (accountId: string, body: object, cookie = admin.cookie) =>
    request(app.getHttpServer())
      .post(`/api/moderation/players/${accountId}/plan`)
      .set('Cookie', cookie)
      .send(body)
  const eventsFor = (accountId: string) =>
    orm.em.fork().find(EventDelivery, { targetId: accountId }, { orderBy: { createdAt: 'asc' } })

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
    plans = () => moduleRef.get(PlanService)
    roles = () => moduleRef.get(AccountRoleAnnouncer)
    moduleEvents = () => moduleRef.get(EventDeliveryService)
    await orm.getSchemaGenerator().refreshDatabase()
    moderator = await account(AccountRole.MODERATOR)
    admin = await account(AccountRole.ADMIN)
  }, 60_000)

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('keeps moderators and players out', async () => {
    const player = await account()

    expect(
      (await setPlan(player.id, { plan: 'founder', pixReference: 'E2E00000001' }, moderator.cookie))
        .status,
    ).toBe(403)
    expect(
      (await setPlan(player.id, { plan: 'founder', pixReference: 'E2E00000001' }, player.cookie))
        .status,
    ).toBe(403)
  })

  it('asks the PIX reference to activate, not to revoke', async () => {
    const player = await account()

    expect((await setPlan(player.id, { plan: 'supporter' })).status).toBe(400)
    expect((await setPlan(player.id, { plan: 'none' })).status).toBe(201)
  })

  it('refuses a plan for a banned account', async () => {
    const player = await account()
    const em = orm.em.fork()
    const row = await em.findOneOrFail(Account, { id: player.id })
    row.state = AccountState.BANNED
    await em.flush()

    expect(
      (await setPlan(player.id, { plan: 'founder', pixReference: 'E2E00000009' })).status,
    ).toBe(409)
  })

  it('activates Founder for good, audits it, and tells the bot', async () => {
    const player = await account()

    const res = await setPlan(player.id, { plan: 'founder', pixReference: 'E2E00000002' })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ plan: 'founder', planExpiresAt: null })
    const [entry] = await orm.em
      .fork()
      .find(AuditEntry, { action: AuditAction.PLAN_CHANGED, targetAccountId: player.id })
    expect(entry).toMatchObject({
      actorId: admin.id,
      before: { plan: 'none', expiresAt: null },
      after: { plan: 'founder', expiresAt: null, pixReference: 'E2E00000002' },
    })
    const [event] = await eventsFor(player.id)
    expect(event!.type).toBe('account.plan_changed')
    expect(moduleEvents().payloadOf(event!)).toEqual({ discordId: player.discord, plan: 'founder' })
  })

  it('renews Supporter on top of the days left, without a second role event, and lapses it', async () => {
    const player = await account()
    await setPlan(player.id, { plan: 'supporter', pixReference: 'E2E00000003' })
    const renewed = await setPlan(player.id, { plan: 'supporter', pixReference: 'E2E00000004' })
    expect(Date.parse(renewed.body.planExpiresAt)).toBeGreaterThan(
      Date.now() + 2 * SUPPORTER_MONTH_MS - 60_000,
    )
    expect(await eventsFor(player.id)).toHaveLength(1)
    const payments = await orm.em.fork().find(PaymentEvent, { account: player.id })
    expect(payments.map((p) => [p.type, p.amount])).toEqual([
      ['supporter', '9.90'],
      ['supporter', '9.90'],
    ])

    await plans().expire(new Date(Date.now() + 2 * SUPPORTER_MONTH_MS + 60_000))

    const row = await orm.em.fork().findOneOrFail(Account, { id: player.id })
    expect(row.plan).toBe(AccountPlan.NONE)
    expect(row.planExpiresAt).toBeNull()
    const events = await eventsFor(player.id)
    expect(moduleEvents().payloadOf(events.at(-1)!)).toMatchObject({ plan: 'none' })
  })

  it('keeps a Founder from being turned into a month of Supporter', async () => {
    const player = await account()
    await setPlan(player.id, { plan: 'founder', pixReference: 'E2E00000005' })

    expect(
      (await setPlan(player.id, { plan: 'supporter', pixReference: 'E2E00000006' })).status,
    ).toBe(409)
  })

  it('revoking what is already none changes and audits nothing', async () => {
    const player = await account()

    await setPlan(player.id, { plan: 'none' })

    expect(
      await orm.em
        .fork()
        .count(AuditEntry, { action: AuditAction.PLAN_CHANGED, targetAccountId: player.id }),
    ).toBe(0)
    expect(await eventsFor(player.id)).toHaveLength(0)
  })

  it('a plan saved in a transaction that rolls back leaves no event behind', async () => {
    const player = await account()

    await expect(
      orm.em.fork().transactional(async (em) => {
        const row = await em.findOneOrFail(Account, { id: player.id })
        row.plan = AccountPlan.FOUNDER
        await em.flush()
        throw new Error('rolled back')
      }),
    ).rejects.toThrow('rolled back')

    expect(await eventsFor(player.id)).toHaveLength(0)
  })

  it('gives the role to someone who links Discord or comes back to the server with a plan', async () => {
    const player = await account()
    const em = orm.em.fork()
    const row = await em.findOneOrFail(Account, { id: player.id })
    const encrypted = row.discordIdEncrypted
    row.discordIdEncrypted = undefined
    row.plan = AccountPlan.FOUNDER
    await em.flush()
    expect(await eventsFor(player.id)).toHaveLength(0)

    row.discordIdEncrypted = encrypted
    await em.flush()
    await roles().resyncOnJoin(player.discord)

    const events = await eventsFor(player.id)
    expect(events.map((e) => moduleEvents().payloadOf(e))).toEqual([
      { discordId: player.discord, plan: 'founder' },
      { discordId: player.discord, plan: 'founder' },
    ])
  })
})
