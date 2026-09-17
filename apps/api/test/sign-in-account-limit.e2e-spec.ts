import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { applySecurity } from '../src/common/security/security.config'
import { FAILED_SIGN_IN_MAX_PER_WINDOW } from '../src/modules/account/session.service'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'

const PASSWORD = 'a-long-enough-password'
const WRONG = 'definitely-not-the-password'

const signUpBody = (email: string) => ({
  email,
  password: PASSWORD,
  birthDate: '1990-05-20',
  securityQuestion: 'Qual o nome do seu primeiro time?',
  securityAnswer: 'São Paulo',
  acceptedTermsVersion: CURRENT_TERMS_VERSION,
})

/**
 * Item 11 asks for a limit "por conta **e** por IP". The per-IP bucket is
 * exercised in security.e2e-spec; this is the other half, and it is the half
 * that survives a distributed attempt — a thousand addresses trying the same
 * account five times each never trips a per-IP counter.
 *
 * THROTTLE_DISABLED is on for the whole suite on purpose: leaving the per-IP
 * bucket in would refuse at the 6th request and the per-account limit would
 * never be reached, so the spec would pass while proving nothing.
 */
describe('sign-in limit per account (item 11, RNF-011)', () => {
  let app: INestApplication
  let orm: MikroORM

  const signIn = (email: string, password: string) =>
    request(app.getHttpServer()).post('/api/sessions').send({ email, password })

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder'

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

  const register = async (email: string): Promise<void> => {
    await request(app.getHttpServer()).post('/api/accounts').send(signUpBody(email))
  }

  it('refuses the correct password once the window is spent', async () => {
    const email = 'limit-spent@test.local'
    await register(email)

    for (let attempt = 0; attempt < FAILED_SIGN_IN_MAX_PER_WINDOW; attempt += 1) {
      expect((await signIn(email, WRONG)).status).toBe(401)
    }

    // The password is right. The window is not.
    const res = await signIn(email, PASSWORD)
    expect(res.status).toBe(401)
  }, 60_000)

  it('is not observable: a locked account answers exactly like an unknown one', async () => {
    const email = 'limit-quiet@test.local'
    await register(email)

    for (let attempt = 0; attempt < FAILED_SIGN_IN_MAX_PER_WINDOW; attempt += 1) {
      await signIn(email, WRONG)
    }

    const locked = await signIn(email, PASSWORD)
    const unknown = await signIn('nobody-has-this-address@test.local', PASSWORD)

    // Identical status and body. Anything else — a 429, a "locked" message, a
    // Retry-After — would confirm the address has an account, which is the
    // signal RF-070 and the decoy hash exist to deny.
    expect(locked.status).toBe(unknown.status)
    expect(locked.body).toEqual(unknown.body)
    expect(locked.headers['retry-after']).toBeUndefined()
  }, 60_000)

  it('lets a person in while they are still under the limit', async () => {
    const email = 'limit-under@test.local'
    await register(email)

    for (let attempt = 0; attempt < FAILED_SIGN_IN_MAX_PER_WINDOW - 1; attempt += 1) {
      await signIn(email, WRONG)
    }

    expect((await signIn(email, PASSWORD)).status).toBe(200)
  }, 60_000)

  it('clears the count on a successful sign-in, so old slips do not accumulate', async () => {
    const email = 'limit-cleared@test.local'
    await register(email)

    for (let attempt = 0; attempt < FAILED_SIGN_IN_MAX_PER_WINDOW - 1; attempt += 1) {
      await signIn(email, WRONG)
    }
    expect((await signIn(email, PASSWORD)).status).toBe(200)

    // Without the reset, this single later mistake would be the 10th in the
    // window and would lock an account whose owner just proved who they are.
    await signIn(email, WRONG)
    expect((await signIn(email, PASSWORD)).status).toBe(200)
  }, 60_000)

  it('counts per account, so one account being locked does not touch another', async () => {
    const victim = 'limit-victim@test.local'
    const bystander = 'limit-bystander@test.local'
    await register(victim)
    await register(bystander)

    for (let attempt = 0; attempt < FAILED_SIGN_IN_MAX_PER_WINDOW; attempt += 1) {
      await signIn(victim, WRONG)
    }

    expect((await signIn(victim, PASSWORD)).status).toBe(401)
    expect((await signIn(bystander, PASSWORD)).status).toBe(200)
  }, 60_000)
})
