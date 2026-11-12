import type { RequiredEntityData } from '@mikro-orm/core'
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
import { AccountRole, AccountState } from '../src/modules/account/account.enums'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { Character, CharacterState } from '../src/modules/character/character.entity'
import { Platform } from '../src/common/domain/platform.enum'
import { CURRENT_EDITION } from '../src/common/domain/game-edition.enum'
import { Lobby, LobbyState } from '../src/modules/lobby/lobby.entity'
import { AuditAction, AuditEntry } from '../src/modules/moderation/audit-entry.entity'
import { ModerationCase } from '../src/modules/moderation/moderation-case.entity'
import {
  ModerationCaseOrigin,
  ModerationCaseType,
} from '../src/modules/moderation/moderation-case.enums'
import { CapturingMailSender } from './support/capturing-mail-sender'

const PASSWORD = 'a-long-enough-password'

/** The panel's read-only sections — #312. */
describe('moderation audit, metrics and player search (#312)', () => {
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
    const email = `insights-${++counter}@test.local`
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

  const api = (path: string, cookie = moderator.cookie) =>
    request(app.getHttpServer()).get(`/api/moderation/${path}`).set('Cookie', cookie)

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

  it('keeps players out of every section', async () => {
    const player = await account()

    for (const path of ['audit', 'metrics', 'players?q=ab']) {
      expect((await api(path, player.cookie)).status).toBe(403)
    }
  })

  it('finds a player by Discord id and by character name, without e-mail or birth date', async () => {
    const player = await account()
    const em = orm.em.fork()
    em.create(Character, {
      account: player.id,
      category: 'midfielder',
      archetype: 'maestro',
      name: 'Teixeirinha',
      platform: Platform.PS5,
      edition: CURRENT_EDITION,
      state: CharacterState.VERIFIED,
    } as RequiredEntityData<Character>)
    await em.flush()

    const byDiscord = await api(`players?q=${player.discord}`)
    const byName = await api('players?q=xeirinh')

    expect(byDiscord.body.map((p: { accountId: string }) => p.accountId)).toEqual([player.id])
    expect(byName.body[0]).toMatchObject({
      accountId: player.id,
      characters: [{ name: 'Teixeirinha', category: 'midfielder' }],
      discordMention: `<@${player.discord}>`,
    })
    expect(JSON.stringify(byName.body)).not.toContain(player.email)
    expect(JSON.stringify(byName.body)).not.toContain('1990-05-20')
  })

  it('treats % and _ in a name search as themselves', async () => {
    const res = await api('players?q=%25%25')

    expect(res.body).toEqual([])
  })

  it('writes each search to the audit log: the kind of term, never the term', async () => {
    const player = await account()

    await api(`players?q=${player.discord}`)

    const entries = await orm.em
      .fork()
      .find(AuditEntry, { action: AuditAction.PLAYER_SEARCHED, actorId: moderator.id })
    expect(entries.at(-1)?.after).toEqual({ kind: 'discord', results: 1 })
    expect(JSON.stringify(entries.map((e) => e.after))).not.toContain(player.discord)
  })

  it('shows a player with their cases and punishments apart', async () => {
    const player = await account()
    const em = orm.em.fork()
    em.create(ModerationCase, {
      type: ModerationCaseType.USER_REPORT,
      origin: ModerationCaseOrigin.USER,
      targetAccount: player.id,
    } as RequiredEntityData<ModerationCase>)
    em.create(ModerationCase, {
      type: ModerationCaseType.SUSPENSION,
      origin: ModerationCaseOrigin.SYSTEM,
      targetAccount: player.id,
      decision: 'Suspensão de 7 dias',
    } as RequiredEntityData<ModerationCase>)
    await em.flush()

    const res = await api(`players/${player.id}`)

    expect(res.status).toBe(200)
    expect(res.body.cases.map((c: { type: string }) => c.type)).toEqual(['user_report'])
    expect(res.body.punishments).toEqual([
      expect.objectContaining({ kind: 'suspension', decision: 'Suspensão de 7 dias' }),
    ])
  })

  it('pages the audit log newest first, filtered by action', async () => {
    const res = await api('audit?action=player_searched')

    expect(res.status).toBe(200)
    const times = res.body.entries.map((e: { createdAt: string }) => Date.parse(e.createdAt))
    expect([...times].sort((a, b) => b - a)).toEqual(times)
    expect(res.body.entries.every((e: { action: string }) => e.action === 'player_searched')).toBe(
      true,
    )
    expect((await api('audit?before=nope')).status).toBe(400)
  })

  it('counts finished matches, the share without dispute, and who came back', async () => {
    const em = orm.em.fork()
    const now = new Date()
    for (let i = 0; i < 4; i++) {
      em.create(Lobby, {
        state: LobbyState.FINISHED,
        createdAt: now,
        endedAt: now,
      } as RequiredEntityData<Lobby>)
    }
    await em.flush()

    const res = await api('metrics')

    const beta = Object.fromEntries(res.body.beta.map((m: { key: string }) => [m.key, m]))
    const success = Object.fromEntries(res.body.success.map((m: { key: string }) => [m.key, m]))
    expect(beta.matches_completed).toMatchObject({ value: 4, target: 10, met: false })
    expect(beta.strangers_share.value).toBeNull()
    expect(success.matches_per_week).toMatchObject({ value: 4, band: 'ambiguous' })
    expect(success.confirmed_without_dispute).toMatchObject({ value: 100, band: 'worked' })
  })
})
