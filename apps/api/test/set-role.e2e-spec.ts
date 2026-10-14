import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes } from 'node:crypto'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { MailSender } from '../src/common/mail/mail.types'
import { applySecurity } from '../src/common/security/security.config'
import { Account } from '../src/modules/account/account.entity'
import { AccountRole } from '../src/modules/account/account.enums'
import { setRole } from '../src/modules/account/set-role.cli'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { AuditAction, AuditEntry } from '../src/modules/moderation/audit-entry.entity'
import { CapturingMailSender } from './support/capturing-mail-sender'

/** #243: a role never moves without an audit entry of who moved it. */
describe('set-role with an audit trail (#243)', () => {
  let app: INestApplication
  let orm: MikroORM
  let counter = 0

  const account = async (): Promise<string> => {
    const email = `role-${++counter}@test.local`
    await request(app.getHttpServer()).post('/api/accounts').send({
      email,
      password: 'a-long-enough-password',
      birthDate: '1990-05-20',
      securityQuestion: 'Qual o nome do seu primeiro time?',
      securityAnswer: 'São Paulo',
      acceptedTermsVersion: CURRENT_TERMS_VERSION,
    })
    return email
  }
  const roleOf = async (email: string) =>
    (await orm.em.fork().findOneOrFail(Account, { email })).role
  const entriesFor = async (email: string) => {
    const target = await orm.em.fork().findOneOrFail(Account, { email })
    return orm.em.fork().find(AuditEntry, { targetAccountId: target.id })
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
  }, 60_000)

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('makes the first admin while there is none, and says it was the bootstrap', async () => {
    const first = await account()

    await setRole(orm, { email: first, role: AccountRole.ADMIN, operator: first })

    expect(await roleOf(first)).toBe(AccountRole.ADMIN)
    const [entry] = await entriesFor(first)
    expect(entry).toMatchObject({
      action: AuditAction.ROLE_CHANGED,
      actorLabel: `cli:bootstrap:${first}`,
      before: { role: 'user' },
      after: { role: 'admin' },
    })
  })

  it('records who promoted a moderator, from what to what', async () => {
    const admin = await account()
    await setRole(orm, { email: admin, role: AccountRole.ADMIN, operator: 'role-1@test.local' })
    const mod = await account()

    await setRole(orm, { email: mod, role: AccountRole.MODERATOR, operator: admin })

    const adminId = (await orm.em.fork().findOneOrFail(Account, { email: admin })).id
    const [entry, ...more] = await entriesFor(mod)
    expect(more).toHaveLength(0)
    expect(entry).toMatchObject({
      actorId: adminId,
      actorLabel: `cli:${admin}`,
      before: { role: 'user' },
      after: { role: 'moderator' },
    })
  })

  it('refuses an operator who is not an admin, and changes nothing', async () => {
    const someone = await account()
    const target = await account()

    await expect(
      setRole(orm, { email: target, role: AccountRole.MODERATOR, operator: someone }),
    ).rejects.toThrow(/not an admin/)

    expect(await roleOf(target)).toBe(AccountRole.USER)
    expect(await entriesFor(target)).toHaveLength(0)
  })

  it('writes no entry when the target does not exist', async () => {
    const before = await orm.em.fork().count(AuditEntry, {})

    await expect(
      setRole(orm, {
        email: 'nobody@test.local',
        role: AccountRole.MODERATOR,
        operator: 'role-1@test.local',
      }),
    ).rejects.toThrow(/no account/)

    expect(await orm.em.fork().count(AuditEntry, {})).toBe(before)
  })
})
