import { MikroORM } from '@mikro-orm/postgresql'
import { Controller, Get, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { AllowStates } from '../src/common/auth/auth.decorators'
import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME } from '../src/common/security/session-cookie'
import { Account } from '../src/modules/account/account.entity'
import { AccountState } from '../src/modules/account/account.enums'
import { TermsAcceptance } from '../src/modules/account/terms-acceptance.entity'
import {
  CURRENT_TERMS_VERSION,
  LATEST_MATERIAL_TERMS_VERSION,
} from '../src/modules/account/terms.constants'

/** Routes that exist only here, to exercise the terms check in the guard. */
@Controller('terms-probe')
class TermsProbeController {
  /** Default route: active account, terms check applies. */
  @Get('default')
  closed(): { ok: true } {
    return { ok: true }
  }

  /** Stands in for the appeal route a banned account may reach (RF-081). */
  @Get('appeal')
  @AllowStates(AccountState.ACTIVE, AccountState.BANNED)
  appeal(): { ok: true } {
    return { ok: true }
  }
}

const PASSWORD = 'a-long-enough-password'

const signUpBody = (email: string, acceptedTermsVersion: string = CURRENT_TERMS_VERSION) => ({
  email,
  password: PASSWORD,
  birthDate: '1990-05-20',
  securityQuestion: 'Qual o nome do seu primeiro time?',
  securityAnswer: 'São Paulo',
  acceptedTermsVersion,
})

describe('terms acceptance (RF-026)', () => {
  let app: INestApplication
  let orm: MikroORM

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  const setState = async (email: string, state: AccountState): Promise<void> => {
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    account.state = state
    await em.flush()
  }

  const acceptancesOf = async (email: string): Promise<TermsAcceptance[]> => {
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    return em.find(TermsAcceptance, { account: account.id })
  }

  /** Removes every acceptance of an account — an account from before a material change. */
  const forgetAcceptances = async (email: string): Promise<void> => {
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    await em.nativeDelete(TermsAcceptance, { account: account.id })
  }

  /** Signs up, puts the account in the given state, signs in, returns the cookie. */
  const sessionFor = async (email: string, state = AccountState.ACTIVE): Promise<string> => {
    await request(app.getHttpServer()).post('/accounts').send(signUpBody(email))
    await setState(email, state)
    const res = await request(app.getHttpServer())
      .post('/sessions')
      .send({ email, password: PASSWORD })
    return cookieOf(res)
  }

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder'

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TermsProbeController],
    }).compile()

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

  describe('at sign-up', () => {
    it('records the accepted version together with the account', async () => {
      const res = await request(app.getHttpServer())
        .post('/accounts')
        .send(signUpBody('signup-terms@test.local'))

      expect(res.status).toBe(202)

      // Committed in the same flush: an account never exists without the
      // acceptance it was created under.
      const acceptances = await acceptancesOf('signup-terms@test.local')
      expect(acceptances).toHaveLength(1)
      expect(acceptances[0]?.version).toBe(CURRENT_TERMS_VERSION)
    })

    it('refuses a sign-up that does not carry an acceptance at all', async () => {
      const withoutTerms: Partial<ReturnType<typeof signUpBody>> = signUpBody('no-terms@test.local')
      delete withoutTerms.acceptedTermsVersion

      const res = await request(app.getHttpServer()).post('/accounts').send(withoutTerms)

      expect(res.status).toBe(400)
      await expect(orm.em.fork().count(Account, { email: 'no-terms@test.local' })).resolves.toBe(0)
    })

    it('refuses a stale form carrying an older version', async () => {
      const res = await request(app.getHttpServer())
        .post('/accounts')
        .send(signUpBody('stale-form@test.local', '2000-01-01'))

      // Consent is to the text being shown today, not to whatever version an
      // old cached form still carries.
      expect(res.status).toBe(400)
      expect(res.body.message).toBe('terms_version_outdated')
      expect(res.body.currentVersion).toBe(CURRENT_TERMS_VERSION)
      await expect(orm.em.fork().count(Account, { email: 'stale-form@test.local' })).resolves.toBe(
        0,
      )
    })
  })

  describe('after a material change', () => {
    it('holds an account without an up-to-date acceptance at the acceptance screen', async () => {
      const cookie = await sessionFor('held@test.local')
      await forgetAcceptances('held@test.local')

      const res = await request(app.getHttpServer())
        .get('/terms-probe/default')
        .set('Cookie', cookie)

      expect(res.status).toBe(403)
      expect(res.body.message).toBe('terms_acceptance_required')
      // Exactly what the front end needs to render the screen, and no more.
      expect(res.body.currentVersion).toBe(CURRENT_TERMS_VERSION)
    })

    it('does not count an acceptance older than the last material change', async () => {
      const cookie = await sessionFor('old-accept@test.local')
      await forgetAcceptances('old-accept@test.local')

      const em = orm.em.fork()
      const account = await em.findOneOrFail(Account, { email: 'old-accept@test.local' })
      em.persist(em.create(TermsAcceptance, { account, version: '2000-01-01' }))
      await em.flush()

      expect('2000-01-01' < LATEST_MATERIAL_TERMS_VERSION).toBe(true)

      const res = await request(app.getHttpServer())
        .get('/terms-probe/default')
        .set('Cookie', cookie)

      // Having accepted *something* is not enough; it has to be at or after
      // the last material revision.
      expect(res.status).toBe(403)
      expect(res.body.message).toBe('terms_acceptance_required')
    })

    it('lets the account through once it accepts the current version', async () => {
      const cookie = await sessionFor('accepts@test.local')
      await forgetAcceptances('accepts@test.local')

      const accept = await request(app.getHttpServer())
        .post('/accounts/terms-acceptances')
        .set('Cookie', cookie)
        .send({ version: CURRENT_TERMS_VERSION })

      expect(accept.status).toBe(204)

      const after = await request(app.getHttpServer())
        .get('/terms-probe/default')
        .set('Cookie', cookie)

      expect(after.status).toBe(200)
    })

    it('keeps the history instead of overwriting the previous acceptance', async () => {
      const cookie = await sessionFor('history@test.local')
      await forgetAcceptances('history@test.local')

      const em = orm.em.fork()
      const account = await em.findOneOrFail(Account, { email: 'history@test.local' })
      em.persist(em.create(TermsAcceptance, { account, version: '2000-01-01' }))
      await em.flush()

      await request(app.getHttpServer())
        .post('/accounts/terms-acceptances')
        .set('Cookie', cookie)
        .send({ version: CURRENT_TERMS_VERSION })

      // Which version, and when: the older row survives next to the new one.
      const versions = (await acceptancesOf('history@test.local')).map((row) => row.version).sort()
      expect(versions).toEqual(['2000-01-01', CURRENT_TERMS_VERSION])
    })
  })

  describe('accepting', () => {
    it('is idempotent: accepting twice leaves one row (RNF-018)', async () => {
      const cookie = await sessionFor('twice-accept@test.local')
      await forgetAcceptances('twice-accept@test.local')

      const first = await request(app.getHttpServer())
        .post('/accounts/terms-acceptances')
        .set('Cookie', cookie)
        .send({ version: CURRENT_TERMS_VERSION })
      const second = await request(app.getHttpServer())
        .post('/accounts/terms-acceptances')
        .set('Cookie', cookie)
        .send({ version: CURRENT_TERMS_VERSION })

      expect(first.status).toBe(204)
      expect(second.status).toBe(204)
      await expect(acceptancesOf('twice-accept@test.local')).resolves.toHaveLength(1)
    })

    it('leaves one row when two acceptances race each other', async () => {
      const cookie = await sessionFor('race-accept@test.local')
      await forgetAcceptances('race-accept@test.local')

      const accept = () =>
        request(app.getHttpServer())
          .post('/accounts/terms-acceptances')
          .set('Cookie', cookie)
          .send({ version: CURRENT_TERMS_VERSION })

      // A double click: both requests pass the guard before either inserts, so
      // only the unique index can keep this at one row — and the loser must
      // still answer 204, not 500.
      const results = await Promise.all([accept(), accept(), accept()])

      expect(results.map((res) => res.status)).toEqual([204, 204, 204])
      await expect(acceptancesOf('race-accept@test.local')).resolves.toHaveLength(1)
    })

    it('refuses to record acceptance of an older version', async () => {
      const cookie = await sessionFor('accept-old@test.local')

      const res = await request(app.getHttpServer())
        .post('/accounts/terms-acceptances')
        .set('Cookie', cookie)
        .send({ version: '2000-01-01' })

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('terms_version_outdated')
    })

    it('requires a session', async () => {
      const res = await request(app.getHttpServer())
        .post('/accounts/terms-acceptances')
        .send({ version: CURRENT_TERMS_VERSION })

      expect(res.status).toBe(401)
    })

    it('stays reachable for a suspended account held at the screen', async () => {
      const cookie = await sessionFor('suspended-accept@test.local', AccountState.SUSPENDED)
      await forgetAcceptances('suspended-accept@test.local')

      const res = await request(app.getHttpServer())
        .post('/accounts/terms-acceptances')
        .set('Cookie', cookie)
        .send({ version: CURRENT_TERMS_VERSION })

      // A state should never trap someone who is trying to comply.
      expect(res.status).toBe(204)
    })
  })

  describe('banned accounts', () => {
    it('reach the appeal without being asked to accept new terms (RF-081)', async () => {
      const cookie = await sessionFor('banned-terms@test.local', AccountState.BANNED)
      await forgetAcceptances('banned-terms@test.local')

      const res = await request(app.getHttpServer())
        .get('/terms-probe/appeal')
        .set('Cookie', cookie)

      // Appealing is exercising a right, not using the platform — making it
      // depend on accepting new terms would make the right depend on consent.
      expect(res.status).toBe(200)
    })
  })
})
