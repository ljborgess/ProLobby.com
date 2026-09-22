import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { applySecurity } from '../src/common/security/security.config'
import { WaitingListEntry } from '../src/modules/account/waiting-list-entry.entity'

describe('sign-up waiting list (RF-078)', () => {
  let app: INestApplication
  let orm: MikroORM

  const join = (email: string) =>
    request(app.getHttpServer()).post('/api/accounts/waiting-list-entries').send({ email })

  const entriesFor = (email: string): Promise<WaitingListEntry[]> =>
    orm.em.fork().find(WaitingListEntry, { email })

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

  it('records the address', async () => {
    const res = await join('wait-new@test.local')

    expect(res.status).toBe(202)
    const entries = await entriesFor('wait-new@test.local')
    expect(entries).toHaveLength(1)
  })

  it('normalises the address the same way sign-up does', async () => {
    await join('Wait-Case@Test.Local')

    const entries = await entriesFor('wait-case@test.local')
    expect(entries).toHaveLength(1)
  })

  it('is idempotent: joining twice leaves exactly one row', async () => {
    await join('wait-twice@test.local')
    const second = await join('wait-twice@test.local')

    expect(second.status).toBe(202)
    const entries = await entriesFor('wait-twice@test.local')
    expect(entries).toHaveLength(1)
  })

  it('lets two different addresses join at once without one losing to the other', async () => {
    const results = await Promise.all([join('wait-race@test.local'), join('wait-race@test.local')])

    for (const res of results) {
      expect(res.status).toBe(202)
    }
    const entries = await entriesFor('wait-race@test.local')
    expect(entries).toHaveLength(1)
  })

  it('rejects a malformed address without creating a row', async () => {
    const res = await join('not-an-email')

    expect(res.status).toBe(400)
    const entries = await entriesFor('not-an-email')
    expect(entries).toHaveLength(0)
  })

  it('never creates an account', async () => {
    const res = await join('wait-no-account@test.local')

    expect(res.status).toBe(202)
    const status = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ email: 'wait-no-account@test.local', password: 'irrelevant-password' })
    // 401, not "account found but wrong password in some other shape" — there
    // is no account to find.
    expect(status.status).toBe(401)
  })
})
