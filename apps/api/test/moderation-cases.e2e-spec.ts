import type { EntityData, RequiredEntityData } from '@mikro-orm/core'
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
import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME } from '../src/common/security/session-cookie'
import { Account } from '../src/modules/account/account.entity'
import { AccountRole, AccountState } from '../src/modules/account/account.enums'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { EventDelivery } from '../src/modules/bot-integration/event-delivery.entity'
import { AuditAction, AuditEntry } from '../src/modules/moderation/audit-entry.entity'
import { ModerationCase } from '../src/modules/moderation/moderation-case.entity'
import {
  ModerationCaseOrigin,
  ModerationCaseState,
  ModerationCaseType,
  UserReportReason,
} from '../src/modules/moderation/moderation-case.enums'
import { CapturingMailSender } from './support/capturing-mail-sender'

const PASSWORD = 'a-long-enough-password'

/** The panel's case queue by section — #306, #307. */
describe('moderation cases by section (#307)', () => {
  let app: INestApplication
  let orm: MikroORM
  let counter = 0
  let moderator: { id: string; cookie: string }

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  const account = async (role = AccountRole.USER) => {
    const email = `cases-${++counter}@test.local`
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
    row.discordIdEncrypted = encryptAtRest(
      readEvidenceEncryptionKey(),
      Buffer.from(`1${String(counter).padStart(17, '0')}`),
    )
    await em.flush()
    const res = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ email, password: PASSWORD })
    return { id: row.id, email, cookie: cookieOf(res) }
  }

  const openCase = async (
    fields: Partial<EntityData<ModerationCase>> & { type: ModerationCaseType },
  ) => {
    const em = orm.em.fork()
    const created = em.create(ModerationCase, {
      origin: ModerationCaseOrigin.USER,
      openedAt: new Date(),
      ...fields,
    } as RequiredEntityData<ModerationCase>)
    await em.flush()
    return created.id
  }

  const report = async (reporterId: string, targetId: string) =>
    openCase({
      type: ModerationCaseType.USER_REPORT,
      openedBy: reporterId,
      targetAccount: targetId,
      reportReason: UserReportReason.BEHAVIOR,
      reportMessage: 'ofendeu no voice',
    })

  const api = () => request(app.getHttpServer())
  const close = (caseId: string, body: Record<string, unknown>, cookie = moderator.cookie) =>
    api().post(`/api/moderation/cases/${caseId}/closures`).set('Cookie', cookie).send(body)

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
    moderator = await account(AccountRole.MODERATOR)
  }, 60_000)

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('refuses a player: the panel is for moderators only', async () => {
    const player = await account()

    const res = await api().get('/api/moderation/cases/summary').set('Cookie', player.cookie)

    expect(res.status).toBe(403)
  })

  it('counts open cases by section and type, leaving born-resolved punishments out', async () => {
    const [a, b] = [await account(), await account()]
    await report(a.id, b.id)
    await openCase({
      type: ModerationCaseType.CAPTAIN_ABUSE,
      targetAccount: b.id,
    })
    await openCase({ type: ModerationCaseType.SCORE_DISPUTE })
    await openCase({ type: ModerationCaseType.SUSPENSION, state: ModerationCaseState.OPEN })

    const res = await api().get('/api/moderation/cases/summary').set('Cookie', moderator.cookie)

    const reports = res.body.sections.find((s: { key: string }) => s.key === 'reports')
    expect(reports.open).toBeGreaterThanOrEqual(2)
    expect(
      reports.types.find((t: { type: string }) => t.type === 'captain_abuse').open,
    ).toBeGreaterThanOrEqual(1)
    expect(JSON.stringify(res.body)).not.toContain('"suspension"')
  })

  it('lists a section oldest first, filtered by type, with a short preview', async () => {
    const [a, b] = [await account(), await account()]
    const id = await report(a.id, b.id)

    const res = await api()
      .get('/api/moderation/cases?section=reports&type=user_report')
      .set('Cookie', moderator.cookie)

    expect(res.status).toBe(200)
    const item = res.body.find((c: { id: string }) => c.id === id)
    expect(item).toMatchObject({
      section: 'reports',
      type: 'user_report',
      preview: 'ofendeu no voice',
    })
    expect(res.body.every((c: { type: string }) => c.type === 'user_report')).toBe(true)
  })

  it('shows who is involved without e-mail or birth date', async () => {
    const [a, b] = [await account(), await account()]
    const id = await report(a.id, b.id)

    const res = await api().get(`/api/moderation/cases/${id}`).set('Cookie', moderator.cookie)

    expect(res.status).toBe(200)
    expect(res.body.people.map((p: { role: string }) => p.role)).toEqual(['opened_by', 'target'])
    expect(res.body.people[0].discordMention).toMatch(/^<@\d{17,20}>$/)
    const body = JSON.stringify(res.body)
    expect(body).not.toContain(a.email)
    expect(body).not.toContain('1990-05-20')
  })

  it('closes with a ready reason and a note, and writes the audit in the same go', async () => {
    const [a, b] = [await account(), await account()]
    const id = await report(a.id, b.id)

    const res = await close(id, {
      outcome: 'resolved',
      reason: 'confirmed',
      note: 'print no Discord',
    })

    expect(res.status).toBe(204)
    const closed = await orm.em.fork().findOneOrFail(ModerationCase, { id })
    expect(closed.state).toBe(ModerationCaseState.RESOLVED)
    expect(closed.decision).toBe('Procedente: confirmado. print no Discord')
    const audit = await orm.em.fork().findOneOrFail(AuditEntry, { caseId: id })
    expect(audit).toMatchObject({ action: AuditAction.CASE_RESOLVED, actorId: moderator.id })
  })

  it('refuses a reason that belongs to the other outcome, and a second closing', async () => {
    const [a, b] = [await account(), await account()]
    const id = await report(a.id, b.id)

    expect((await close(id, { outcome: 'resolved', reason: 'no_evidence' })).status).toBe(400)
    expect((await close(id, { outcome: 'dismissed', reason: 'no_evidence' })).status).toBe(204)
    expect((await close(id, { outcome: 'dismissed', reason: 'duplicate' })).status).toBe(409)
  })

  it('leaves character verification to its own flow', async () => {
    const id = await openCase({ type: ModerationCaseType.CHARACTER_VERIFICATION })

    expect((await close(id, { outcome: 'resolved', reason: 'confirmed' })).status).toBe(409)
  })

  it('never lets a moderator see or close a case about themselves', async () => {
    const other = await account()
    const id = await report(other.id, moderator.id)

    expect(
      (await api().get(`/api/moderation/cases/${id}`).set('Cookie', moderator.cookie)).status,
    ).toBe(403)
    expect((await close(id, { outcome: 'dismissed', reason: 'no_evidence' })).status).toBe(403)
  })

  it('counts a dismissed report towards RF-069: the third opens a case on the reporter', async () => {
    const reporter = await account()
    for (let i = 0; i < 3; i++) {
      const target = await account()
      const id = await report(reporter.id, target.id)
      await close(id, { outcome: 'dismissed', reason: 'no_evidence' })
    }

    const baseless = await orm.em.fork().count(ModerationCase, {
      type: ModerationCaseType.BASELESS_REPORTS,
      targetAccount: reporter.id,
    })
    expect(baseless).toBe(1)
  })

  it('queues the DM to whoever reported, never to the person reported (#308, RF-036)', async () => {
    const [reporter, target] = [await account(), await account()]
    const id = await report(reporter.id, target.id)

    await close(id, { outcome: 'resolved', reason: 'confirmed' })

    const deliveries = await orm.em.fork().find(EventDelivery, {
      type: 'moderation.case_closed',
      targetId: { $in: [reporter.id, target.id] },
    })
    expect(deliveries.map((d) => d.targetId)).toEqual([reporter.id])
  })

  it('tells nobody when the system opened the case', async () => {
    const before = await orm.em.fork().count(EventDelivery, { type: 'moderation.case_closed' })
    const id = await openCase({
      type: ModerationCaseType.SCORE_DISPUTE,
      origin: ModerationCaseOrigin.SYSTEM,
    })

    await close(id, { outcome: 'dismissed', reason: 'already_resolved' })

    expect(await orm.em.fork().count(EventDelivery, { type: 'moderation.case_closed' })).toBe(
      before,
    )
  })
})
