import { Body, Controller, Get, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { IsEmail, IsInt, Max, Min } from 'class-validator'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { Public } from '../src/common/auth/auth.decorators'
import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '../src/common/security/session-cookie'
import { LOGIN_THROTTLE } from '../src/common/security/throttler.config'

class SampleDto {
  @IsEmail()
  email!: string

  @IsInt()
  @Min(16)
  @Max(120)
  age!: number
}

/**
 * A controller that exists only for this spec, mounted on the *real*
 * AppModule.
 *
 * Testing the account endpoints instead would tie these guarantees to whatever
 * that module happens to look like — and they must hold for every endpoint,
 * including the ones not written yet. Mounting on a hand-built module would be
 * worse still: it would prove the guarantees about an application nobody runs,
 * which is exactly the gap that moving the pipe into AppModule closed.
 */
@Controller('security-probe')
class SecurityProbeController {
  @Public()
  @Post()
  create(@Body() dto: SampleDto) {
    return { received: dto }
  }

  @Public()
  @Get('headers')
  headers(): { ok: true } {
    return { ok: true }
  }

  /** No `@Throttle`: whatever the default throttler allows, and nothing else. */
  @Public()
  @Get('undecorated')
  undecorated(): { ok: true } {
    return { ok: true }
  }

  @Public()
  @Post('login-bucket')
  @Throttle(LOGIN_THROTTLE)
  loginBucket() {
    return { ok: true }
  }

  @Public()
  @Post('login-bucket-cf')
  @Throttle(LOGIN_THROTTLE)
  loginBucketCf() {
    return { ok: true }
  }
}

describe('transversal security', () => {
  let app: INestApplication

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder'

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [SecurityProbeController],
    }).compile()

    app = moduleRef.createNestApplication()
    applySecurity(app)
    await app.init()
  }, 60_000)

  afterAll(async () => {
    await app.close()
  })

  describe('input validation', () => {
    it('accepts a body that matches the DTO', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/security-probe')
        .send({ email: 'person@test.local', age: 20 })

      expect(res.status).toBe(201)
    })

    it('rejects an unknown property instead of silently dropping it', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/security-probe')
        .send({ email: 'person@test.local', age: 20, reputation: 100 })

      // 400, not 201 with the field ignored: silent stripping would hide the
      // attempt, and nobody would ever know `reputation` had been sent.
      expect(res.status).toBe(400)
      expect(JSON.stringify(res.body)).toContain('reputation')
    })

    it('rejects a value that breaks the rule', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/security-probe')
        .send({ email: 'not-an-email', age: 15 })

      expect(res.status).toBe(400)
    })

    it('does not leak a stack trace in the error body', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/security-probe')
        .send({ age: 'twenty' })

      expect(res.status).toBe(400)
      const body = JSON.stringify(res.body)
      expect(body).not.toContain('node_modules')
      expect(body).not.toMatch(/\bat\s+\w+\s+\(/)
    })
  })

  describe('security headers', () => {
    it('sets the headers helmet is here for', async () => {
      const res = await request(app.getHttpServer()).get('/api/security-probe/headers')

      expect(res.headers['x-content-type-options']).toBe('nosniff')
      expect(res.headers['strict-transport-security']).toBeDefined()
      // helmet answers frame embedding through CSP's frame-ancestors and/or
      // the legacy header; either one satisfies item 18.
      const framing = res.headers['x-frame-options'] ?? res.headers['content-security-policy'] ?? ''
      expect(framing).toBeTruthy()
    })

    it('does not advertise the framework', async () => {
      const res = await request(app.getHttpServer()).get('/api/security-probe/headers')

      // Knowing the stack makes picking a matching CVE trivial.
      expect(res.headers['x-powered-by']).toBeUndefined()
    })
  })

  describe('rate limiting', () => {
    it('answers 429 once the login bucket is spent', async () => {
      const server = app.getHttpServer()
      const statuses: number[] = []

      for (let attempt = 0; attempt < 7; attempt += 1) {
        const res = await request(server).post('/api/security-probe/login-bucket').send({})
        statuses.push(res.status)
      }

      // The shape matters, not just "some request was refused": asserting only
      // that a 429 exists would also pass with a limit of 1, which would lock
      // out anyone who mistypes a password once — and the test would stay green.
      expect(statuses.slice(0, 5).every((status) => status < 400)).toBe(true)
      expect(statuses.slice(5).every((status) => status === 429)).toBe(true)
    })

    it('does not apply a strict limit to a route that never asked for one', async () => {
      const server = app.getHttpServer()
      const statuses: number[] = []

      // Ten is past both strict limits that used to leak onto every route:
      // the 5/min of LOGIN_THROTTLE and the 10/hour of SIGNUP_THROTTLE. With
      // named throttlers this answered 429 from the 6th request on — and no
      // test noticed, because every other one stops below five.
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const res = await request(server).get('/api/security-probe/undecorated')
        statuses.push(res.status)
      }

      expect(statuses.every((status) => status === 200)).toBe(true)
    })

    it('counts an undecorated route only under the default limit', async () => {
      const res = await request(app.getHttpServer()).get('/api/security-probe/undecorated')

      // One ceiling, and it is the permissive one. A second `x-ratelimit-*`
      // family here means some other bucket is counting this route again.
      expect(res.headers['x-ratelimit-limit']).toBe('120')
      expect(
        Object.keys(res.headers).filter((name) => name.startsWith('x-ratelimit-limit')),
      ).toEqual(['x-ratelimit-limit'])
    })
  })

  describe('rate limiting behind Cloudflare (#99)', () => {
    const spend = (cfConnectingIp?: string) => {
      const server = app.getHttpServer()
      const req = request(server).post('/api/security-probe/login-bucket-cf')
      return cfConnectingIp ? req.set('cf-connecting-ip', cfConnectingIp) : req.send({})
    }

    it('tracks distinct CF-Connecting-IP values as distinct clients in production', async () => {
      const original = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        const first: number[] = []
        for (let attempt = 0; attempt < 5; attempt += 1) {
          first.push((await spend('203.0.113.10')).status)
        }
        // A different real client, same in-memory storage: spending its own
        // bucket must not be affected by the one above.
        const second = await spend('203.0.113.20')

        expect(first.every((status) => status < 400)).toBe(true)
        expect(second.status).toBe(201)
      } finally {
        process.env.NODE_ENV = original
      }
    })

    it('falls back to req.ip in production when the header is absent, without breaking', async () => {
      const original = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      try {
        const res = await spend(undefined)
        expect(res.status).toBe(201)
      } finally {
        process.env.NODE_ENV = original
      }
    })
  })

  describe('session cookie', () => {
    it('is HttpOnly, SameSite and scoped to the whole app', () => {
      const options = sessionCookieOptions(3_600_000)

      expect(options.httpOnly).toBe(true)
      expect(options.sameSite).toBe('lax')
      expect(options.path).toBe('/')
      expect(options.maxAge).toBe(3_600_000)
    })

    it('is Secure in production and not in development', () => {
      const original = process.env.NODE_ENV

      try {
        process.env.NODE_ENV = 'production'
        expect(sessionCookieOptions(1).secure).toBe(true)

        process.env.NODE_ENV = 'development'
        // A Secure cookie over plain-HTTP localhost is never stored at all,
        // which looks like a broken login instead of a misconfiguration.
        expect(sessionCookieOptions(1).secure).toBe(false)
      } finally {
        process.env.NODE_ENV = original
      }
    })

    it('has one name, so setting and clearing cannot drift', () => {
      expect(SESSION_COOKIE_NAME).toBe('prolobby_session')
    })
  })
})
