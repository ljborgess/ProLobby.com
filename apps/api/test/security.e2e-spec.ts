import { Body, Controller, Get, Post } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import { IsEmail, IsInt, Max, Min } from 'class-validator'
import request from 'supertest'

import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '../src/common/security/session-cookie'
import { throttlerConfig } from '../src/common/security/throttler.config'

class SampleDto {
  @IsEmail()
  email!: string

  @IsInt()
  @Min(16)
  @Max(120)
  age!: number
}

/**
 * A controller that exists only for this spec. Testing the real endpoints
 * would couple these guarantees to whatever the account module happens to look
 * like — and these guarantees have to hold for *every* endpoint, including the
 * ones not written yet.
 */
@Controller('sample')
class SampleController {
  @Post()
  create(@Body() dto: SampleDto) {
    return { received: dto }
  }

  @Get('cookie')
  cookie(): { ok: true } {
    return { ok: true }
  }

  @Post('login')
  @Throttle({ login: { limit: 5, ttl: 60_000 } })
  login() {
    return { ok: true }
  }
}

describe('transversal security', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(throttlerConfig)],
      controllers: [SampleController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile()

    app = moduleRef.createNestApplication()
    applySecurity(app)
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('input validation', () => {
    it('accepts a body that matches the DTO', async () => {
      const res = await request(app.getHttpServer())
        .post('/sample')
        .send({ email: 'person@test.local', age: 20 })

      expect(res.status).toBe(201)
    })

    it('rejects an unknown property instead of silently dropping it', async () => {
      const res = await request(app.getHttpServer())
        .post('/sample')
        .send({ email: 'person@test.local', age: 20, reputation: 100 })

      // 400, not 201 with the field ignored: silent stripping would hide the
      // attempt, and nobody would ever know `reputation` had been sent.
      expect(res.status).toBe(400)
      expect(JSON.stringify(res.body)).toContain('reputation')
    })

    it('rejects a value that breaks the rule', async () => {
      const res = await request(app.getHttpServer())
        .post('/sample')
        .send({ email: 'not-an-email', age: 15 })

      expect(res.status).toBe(400)
    })

    it('does not leak a stack trace in the error body', async () => {
      const res = await request(app.getHttpServer()).post('/sample').send({ age: 'twenty' })

      expect(res.status).toBe(400)
      const body = JSON.stringify(res.body)
      expect(body).not.toContain('node_modules')
      expect(body).not.toMatch(/\bat\s+\w+\s+\(/)
    })
  })

  describe('security headers', () => {
    it('sets the headers helmet is here for', async () => {
      const res = await request(app.getHttpServer()).get('/sample/cookie')

      expect(res.headers['x-content-type-options']).toBe('nosniff')
      expect(res.headers['strict-transport-security']).toBeDefined()
      // helmet answers frame embedding through CSP's frame-ancestors and/or
      // the legacy header; either one satisfies item 18.
      const framing = res.headers['x-frame-options'] ?? res.headers['content-security-policy'] ?? ''
      expect(framing).toBeTruthy()
    })

    it('does not advertise the framework', async () => {
      const res = await request(app.getHttpServer()).get('/sample/cookie')

      // Knowing the stack makes picking a matching CVE trivial.
      expect(res.headers['x-powered-by']).toBeUndefined()
    })
  })

  describe('rate limiting', () => {
    it('answers 429 once the login bucket is spent', async () => {
      const server = app.getHttpServer()
      const statuses: number[] = []

      for (let attempt = 0; attempt < 7; attempt += 1) {
        const res = await request(server).post('/sample/login').send({})
        statuses.push(res.status)
      }

      // Five go through, the rest are refused — a legitimate person does not
      // sign in six times a minute, and this is where guessing pays off.
      expect(statuses.filter((status) => status === 429).length).toBeGreaterThan(0)
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
