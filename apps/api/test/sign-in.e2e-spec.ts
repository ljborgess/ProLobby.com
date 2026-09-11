import { MikroORM } from '@mikro-orm/postgresql'
import { Controller, Get, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { AllowStates } from '../src/common/auth/auth.decorators'
import { SESSION_TTL_MS } from '../src/common/auth/session.constants'
import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME } from '../src/common/security/session-cookie'
import { Account } from '../src/modules/account/account.entity'
import { AccountState } from '../src/modules/account/account.enums'

/** Routes that exist only here, to exercise the guard's defaults. */
@Controller('guard-probe')
class GuardProbeController {
  /** No decorator: the closed default (ADR-007). */
  @Get('default')
  closed(): { ok: true } {
    return { ok: true }
  }

  /** What a banned account is allowed to reach — RF-081. */
  @Get('appeal')
  @AllowStates(AccountState.ACTIVE, AccountState.UNVERIFIED, AccountState.BANNED)
  appeal(): { ok: true } {
    return { ok: true }
  }
}

const PASSWORD = 'a-long-enough-password'

const signUpBody = (email: string) => ({
  email,
  password: PASSWORD,
  birthDate: '1990-05-20',
  securityQuestion: 'Qual o nome do seu primeiro time?',
  securityAnswer: 'São Paulo',
})

describe('sessions', () => {
  let app: INestApplication
  let orm: MikroORM

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  /**
   * Signs an account up and straight in, returning its session cookie.
   *
   * Activates by default because a freshly created account is UNVERIFIED, and
   * the guard default is ACTIVE — so without this every probe would answer 403
   * for the wrong reason.
   */
  const sessionFor = async (email: string, state = AccountState.ACTIVE): Promise<string> => {
    await request(app.getHttpServer()).post('/accounts').send(signUpBody(email))
    if (state !== AccountState.UNVERIFIED) {
      await setState(email, state)
    }
    const res = await request(app.getHttpServer())
      .post('/sessions')
      .send({ email, password: PASSWORD })
    return cookieOf(res)
  }

  const setState = async (email: string, state: AccountState): Promise<void> => {
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    account.state = state
    await em.flush()
  }

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder'

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [GuardProbeController],
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

  describe('sign in', () => {
    it('returns the session in an HttpOnly cookie, never in the body', async () => {
      await request(app.getHttpServer()).post('/accounts').send(signUpBody('login@test.local'))

      const res = await request(app.getHttpServer())
        .post('/sessions')
        .send({ email: 'login@test.local', password: PASSWORD })

      expect(res.status).toBe(200)
      expect(cookieOf(res)).toContain('HttpOnly')
      // A token in the body would have to be held by JavaScript, which is what
      // the HttpOnly cookie exists to prevent.
      expect(JSON.stringify(res.body)).not.toContain('.')
    })

    it('accepts the email in any case, like sign-up does', async () => {
      await request(app.getHttpServer()).post('/accounts').send(signUpBody('case@test.local'))

      const res = await request(app.getHttpServer())
        .post('/sessions')
        .send({ email: 'CASE@Test.Local', password: PASSWORD })

      expect(res.status).toBe(200)
    })

    it('does not let a new session disturb an existing one (RF-022)', async () => {
      await request(app.getHttpServer()).post('/accounts').send(signUpBody('two@test.local'))
      await setState('two@test.local', AccountState.ACTIVE)

      const first = await request(app.getHttpServer())
        .post('/sessions')
        .send({ email: 'two@test.local', password: PASSWORD })
      const second = await request(app.getHttpServer())
        .post('/sessions')
        .send({ email: 'two@test.local', password: PASSWORD })

      // Both still work: the lock that matters (one queue entry) is per
      // account, not per session.
      for (const cookie of [cookieOf(first), cookieOf(second)]) {
        const probe = await request(app.getHttpServer())
          .get('/guard-probe/default')
          .set('Cookie', cookie)
        expect(probe.status).toBe(200)
      }
    })

    it('sets a cookie whose lifetime matches the token', async () => {
      await request(app.getHttpServer()).post('/accounts').send(signUpBody('maxage@test.local'))

      const res = await request(app.getHttpServer())
        .post('/sessions')
        .send({ email: 'maxage@test.local', password: PASSWORD })

      // Both read from SESSION_TTL_SECONDS, so one cannot outlive the other.
      expect(cookieOf(res)).toContain(`Max-Age=${SESSION_TTL_MS / 1000}`)
    })
  })

  describe('RF-070 — the answer never says which one failed', () => {
    it('gives the same response for a wrong password and an unknown email', async () => {
      await request(app.getHttpServer()).post('/accounts').send(signUpBody('known@test.local'))

      const wrongPassword = await request(app.getHttpServer())
        .post('/sessions')
        .send({ email: 'known@test.local', password: 'wrong-but-long-enough' })
      const unknownEmail = await request(app.getHttpServer())
        .post('/sessions')
        .send({ email: 'nobody@test.local', password: PASSWORD })

      expect(wrongPassword.status).toBe(401)
      expect(unknownEmail.status).toBe(wrongPassword.status)
      expect(unknownEmail.body).toEqual(wrongPassword.body)
      expect(JSON.stringify(unknownEmail.body)).not.toMatch(/exist|found|unknown|email/i)
    })

    it('takes comparable time for a wrong password and an unknown email', async () => {
      await request(app.getHttpServer()).post('/accounts').send(signUpBody('timing@test.local'))

      const measure = async (email: string): Promise<number> => {
        const started = process.hrtime.bigint()
        await request(app.getHttpServer())
          .post('/sessions')
          .send({ email, password: 'wrong-but-long-enough' })
        return Number(process.hrtime.bigint() - started) / 1_000_000
      }

      const median = (samples: number[]): number =>
        [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)] ?? 0

      await measure('timing@test.local')

      const known: number[] = []
      const unknown: number[] = []

      for (let round = 0; round < 5; round += 1) {
        known.push(await measure('timing@test.local'))
        unknown.push(await measure(`ghost-${round}@test.local`))
      }

      // Without the decoy hash, the unknown-email path would skip argon2 and
      // answer in microseconds — enumerating accounts with a stopwatch.
      const ratio = median(known) / median(unknown)
      expect(ratio).toBeGreaterThan(0.5)
      expect(ratio).toBeLessThan(2)
    })
  })

  describe('the guard is closed by default (ADR-007)', () => {
    it('refuses a request with no session', async () => {
      const res = await request(app.getHttpServer()).get('/guard-probe/default')

      expect(res.status).toBe(401)
    })

    it('refuses a tampered token', async () => {
      const res = await request(app.getHttpServer())
        .get('/guard-probe/default')
        .set('Cookie', `${SESSION_COOKIE_NAME}=not.a.jwt`)

      expect(res.status).toBe(401)
    })

    it('keeps sign-up and health reachable without a session', async () => {
      await expect(
        request(app.getHttpServer())
          .get('/health')
          .then((res) => res.status),
      ).resolves.toBe(200)
    })
  })

  describe('account state decides what a session reaches', () => {
    it('lets an unverified account reach what is opened to it, and nothing else', async () => {
      const cookie = await sessionFor('unverified@test.local', AccountState.UNVERIFIED)

      const opened = await request(app.getHttpServer())
        .get('/guard-probe/appeal')
        .set('Cookie', cookie)
      const closed = await request(app.getHttpServer())
        .get('/guard-probe/default')
        .set('Cookie', cookie)

      // The default is ACTIVE, so a route only reaches an unverified account
      // when it says so. An account nobody proved control of is the doorway to
      // account farming — it should not inherit access by omission.
      expect(opened.status).toBe(200)
      expect(closed.status).toBe(403)
      expect(closed.body.state).toBe(AccountState.UNVERIFIED)
    })

    it('signs a banned account in, but only into the appeal (RF-081)', async () => {
      const cookie = await sessionFor('banned@test.local')
      await setState('banned@test.local', AccountState.BANNED)

      const appeal = await request(app.getHttpServer())
        .get('/guard-probe/appeal')
        .set('Cookie', cookie)
      const anythingElse = await request(app.getHttpServer())
        .get('/guard-probe/default')
        .set('Cookie', cookie)

      // The right to appeal (RF-037) cannot depend on Discord: someone banned
      // for sign-up fraud may never have linked one.
      expect(appeal.status).toBe(200)
      expect(anythingElse.status).toBe(403)
      expect(anythingElse.body.state).toBe(AccountState.BANNED)
    })

    it('applies a ban on the very next request, not when the token expires', async () => {
      const cookie = await sessionFor('justbanned@test.local')

      const before = await request(app.getHttpServer())
        .get('/guard-probe/default')
        .set('Cookie', cookie)
      expect(before.status).toBe(200)

      await setState('justbanned@test.local', AccountState.BANNED)

      const after = await request(app.getHttpServer())
        .get('/guard-probe/default')
        .set('Cookie', cookie)

      // This is the whole reason the token carries no state: otherwise a
      // banned account would keep playing for up to seven days.
      expect(after.status).toBe(403)
    })

    it('refuses a deleted account entirely, on sign-in and on an existing session', async () => {
      const cookie = await sessionFor('deleted@test.local')
      await setState('deleted@test.local', AccountState.DELETED)

      const existingSession = await request(app.getHttpServer())
        .get('/guard-probe/appeal')
        .set('Cookie', cookie)
      const freshSignIn = await request(app.getHttpServer())
        .post('/sessions')
        .send({ email: 'deleted@test.local', password: PASSWORD })

      expect(existingSession.status).toBe(403)
      // Never 403 on sign-in: that would confirm the account had existed.
      expect(freshSignIn.status).toBe(401)
    })
  })

  describe('sign out', () => {
    it('clears the cookie', async () => {
      const cookie = await sessionFor('logout@test.local')

      const res = await request(app.getHttpServer()).delete('/sessions').set('Cookie', cookie)

      expect(res.status).toBe(204)
      // Cleared with the same options it was written with — a mismatch makes
      // the browser keep the original cookie and the sign-out do nothing.
      expect(cookieOf(res)).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/)
    })
  })
})
