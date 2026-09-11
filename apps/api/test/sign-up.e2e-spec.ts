import { MikroORM } from '@mikro-orm/postgresql'
import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { applySecurity } from '../src/common/security/security.config'
import { Account } from '../src/modules/account/account.entity'
import { AccountRole, AccountState } from '../src/modules/account/account.enums'
import { normaliseSecurityAnswer } from '../src/modules/account/account.service'

const validBody = (email: string) => ({
  email,
  password: 'a-long-enough-password',
  birthDate: '1990-05-20',
  securityQuestion: 'Qual o nome do seu primeiro time?',
  securityAnswer: 'São Paulo',
})

describe('POST /accounts (sign-up)', () => {
  let app: INestApplication
  let orm: MikroORM

  beforeAll(async () => {
    // Rate limiting is proven in security.e2e-spec, against its own controller.
    // Leaving it on here would make these business-rule tests fail by volume —
    // and a test that fails for the wrong reason teaches people to ignore it.
    process.env.THROTTLE_DISABLED = 'true'

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()

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

  describe('RF-019 — open sign-up', () => {
    it('creates an account with sane defaults', async () => {
      const res = await request(app.getHttpServer())
        .post('/accounts')
        .send(validBody('new@test.local'))

      expect(res.status).toBe(202)

      const account = await orm.em.fork().findOneOrFail(Account, { email: 'new@test.local' })
      expect(account.role).toBe(AccountRole.USER)
      expect(account.state).toBe(AccountState.UNVERIFIED)
      expect(account.reputation).toBe(70)
      expect(account.emailVerified).toBe(false)
    })

    it('never stores the password or the security answer in the clear', async () => {
      await request(app.getHttpServer()).post('/accounts').send(validBody('hashed@test.local'))

      const account = await orm.em.fork().findOneOrFail(Account, { email: 'hashed@test.local' })
      expect(account.passwordHash).not.toContain('a-long-enough-password')
      expect(account.securityAnswerHash).not.toContain('Paulo')
      expect(account.passwordHash.startsWith('$argon2id$')).toBe(true)
    })

    it('refuses a body carrying a field the form does not expose', async () => {
      const res = await request(app.getHttpServer())
        .post('/accounts')
        .send({ ...validBody('massassign@test.local'), reputation: 100, role: 'admin' })

      // Item 8: rejected, not silently stripped — otherwise nobody would ever
      // know the attempt happened.
      expect(res.status).toBe(400)
      await expect(orm.em.fork().count(Account, { email: 'massassign@test.local' })).resolves.toBe(
        0,
      )
    })
  })

  describe('RF-021 — minimum age', () => {
    it('refuses someone under 16 without creating an account', async () => {
      const tooYoung = new Date()
      tooYoung.setUTCFullYear(tooYoung.getUTCFullYear() - 15)

      const res = await request(app.getHttpServer())
        .post('/accounts')
        .send({ ...validBody('young@test.local'), birthDate: tooYoung.toISOString().slice(0, 10) })

      expect(res.status).toBe(400)
      await expect(orm.em.fork().count(Account, { email: 'young@test.local' })).resolves.toBe(0)
    })
  })

  describe('RF-020 + RF-070 — one email, and the screen never says so', () => {
    it('normalises case, so the same address cannot be taken twice', async () => {
      const first = await request(app.getHttpServer())
        .post('/accounts')
        .send(validBody('Person@Test.Local'))
      const second = await request(app.getHttpServer())
        .post('/accounts')
        .send(validBody('person@test.local'))

      expect(first.status).toBe(202)
      expect(second.status).toBe(202)

      // One row, stored lowercase: without normalisation these would be two
      // valid accounts, and RF-020 would break in the most banal way possible.
      await expect(orm.em.fork().count(Account, { email: 'person@test.local' })).resolves.toBe(1)
    })

    it('answers identically for a free and for a taken address', async () => {
      const free = await request(app.getHttpServer())
        .post('/accounts')
        .send(validBody('free@test.local'))
      const taken = await request(app.getHttpServer())
        .post('/accounts')
        .send(validBody('free@test.local'))

      expect(taken.status).toBe(free.status)
      expect(taken.body).toEqual(free.body)
      // No field anywhere hints at which case happened.
      expect(JSON.stringify(taken.body)).not.toMatch(/exist|taken|duplicate|already/i)
    })

    it('takes comparable time for a free and for a taken address', async () => {
      const measure = async (email: string): Promise<number> => {
        const started = process.hrtime.bigint()
        await request(app.getHttpServer()).post('/accounts').send(validBody(email))
        return Number(process.hrtime.bigint() - started) / 1_000_000
      }

      // Warm up, so JIT and connection setup do not land on the first sample.
      await measure('warmup@test.local')

      const takenMs = await measure('warmup@test.local')
      const freeMs = await measure('fresh-timing@test.local')

      // Hashing runs on both paths on purpose. Skipping it for a taken address
      // would make that case measurably faster, and RF-070 would fall to a
      // stopwatch rather than to the response body. The ratio is loose because
      // the free path also writes a row — the point is that the taken path is
      // not *dramatically* faster.
      expect(takenMs).toBeGreaterThan(freeMs * 0.4)
    })
  })

  describe('security answer normalisation', () => {
    it('folds case, accents and inner whitespace', () => {
      // "São Paulo", "sao paulo" and " São  Paulo " must reach the same hash,
      // or the legitimate person fails their own recovery factor (RF-025).
      expect(normaliseSecurityAnswer('São Paulo')).toBe('sao paulo')
      expect(normaliseSecurityAnswer(' São  Paulo ')).toBe('sao paulo')
      expect(normaliseSecurityAnswer('SAO PAULO')).toBe('sao paulo')
    })
  })
})
