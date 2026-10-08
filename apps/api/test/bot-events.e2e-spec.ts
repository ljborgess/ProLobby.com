import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import {
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  signWebhookPayload,
  type BotEvent,
} from '@prolobby/types'
import { randomBytes, randomUUID } from 'node:crypto'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { hashIdentity, readIdentityHmacSecret } from '../src/common/security/identity-hmac'
import { applySecurity } from '../src/common/security/security.config'
import { Account } from '../src/modules/account/account.entity'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'

const SECRET = 'test-webhook-secret-not-the-placeholder'
const LINKED = '111111111111111111'
const STRANGER = '999999999999999999'

describe('bot → platform events (#150, RF-060)', () => {
  let app: INestApplication
  let orm: MikroORM
  let counter = 0

  const iso = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString()

  const event = (
    type: 'discord.member_left' | 'discord.member_joined',
    discordId: string,
    occurredAt = iso(),
  ): BotEvent => ({
    id: randomUUID(),
    occurredAt,
    type,
    payload: { discordId },
  })

  /** Signs and posts the exact bytes given — the signature covers them, not a parsed body. */
  const post = (
    body: string,
    {
      secret = SECRET,
      signedAt = iso(),
      signature,
    }: { secret?: string; signedAt?: string; signature?: string | null } = {},
  ) => {
    const req = request(app.getHttpServer())
      .post('/api/bot-events')
      .set('content-type', 'application/json')
      .set(WEBHOOK_TIMESTAMP_HEADER, signedAt)
    if (signature !== null) {
      req.set(WEBHOOK_SIGNATURE_HEADER, signature ?? signWebhookPayload(secret, signedAt, body))
    }
    return req.send(body)
  }

  const send = (e: BotEvent) => post(JSON.stringify(e))

  const snapshot = (discordIds: string[], occurredAt = iso()): BotEvent => ({
    id: randomUUID(),
    occurredAt,
    type: 'discord.presence_snapshot',
    payload: { discordIds },
  })

  /** An account whose Discord is linked, set directly: the OAuth flow is not what is under test. */
  const linkedAccount = async (discordId = LINKED) => {
    const email = `presence-${++counter}@test.local`
    await request(app.getHttpServer()).post('/api/accounts').send({
      email,
      password: 'a-long-enough-password',
      birthDate: '1990-05-20',
      securityQuestion: 'Qual o nome do seu primeiro time?',
      securityAnswer: 'São Paulo',
      acceptedTermsVersion: CURRENT_TERMS_VERSION,
    })
    const em = orm.em.fork()
    const account = await em.findOneOrFail(Account, { email })
    account.discordIdHash = hashIdentity(readIdentityHmacSecret(), discordId)
    account.discordIdEncrypted = Buffer.from('ciphertext-stand-in')
    await em.flush()
    return email
  }

  const stored = (email: string) => orm.em.fork().findOneOrFail(Account, { email })

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder-0123456789'
    process.env.WEBHOOK_SECRET = SECRET
    process.env.EVIDENCE_ENCRYPTION_KEY ??= randomBytes(32).toString('base64')
    process.env.IDENTITY_HMAC_SECRET ??= randomBytes(32).toString('base64')

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

  it('blocks the queue when the member leaves, and leaves the link untouched', async () => {
    const email = await linkedAccount('222222222222222222')
    const before = await stored(email)

    const res = await send(event('discord.member_left', '222222222222222222'))

    expect(res.status).toBe(204)
    const after = await stored(email)
    expect(after.discordPresent).toBe(false)
    expect(after.discordIdHash).toBe(before.discordIdHash)
    expect(
      Buffer.compare(after.discordIdEncrypted as Buffer, before.discordIdEncrypted as Buffer),
    ).toBe(0)
  })

  it('unblocks by itself when the member comes back, with no moderator', async () => {
    const email = await linkedAccount('333333333333333333')
    await send(event('discord.member_left', '333333333333333333', iso(-2000)))

    await send(event('discord.member_joined', '333333333333333333', iso(-1000)))

    expect((await stored(email)).discordPresent).toBe(true)
  })

  it('ignores a member with no account, answering exactly like one that has an account', async () => {
    const email = await linkedAccount('444444444444444444')

    const known = await send(event('discord.member_left', '444444444444444444'))
    const unknown = await send(event('discord.member_left', STRANGER))

    expect(unknown.status).toBe(204)
    expect(unknown.status).toBe(known.status)
    expect(unknown.text).toBe(known.text)
    expect((await stored(email)).discordPresent).toBe(false)
  })

  it('gives the same result when the same event is delivered twice', async () => {
    const email = await linkedAccount('555555555555555555')
    const e = event('discord.member_left', '555555555555555555')

    const first = await send(e)
    const second = await send(e)

    expect([first.status, second.status]).toEqual([204, 204])
    expect((await stored(email)).discordPresent).toBe(false)
  })

  it('does not let a delayed "left" undo a later "joined"', async () => {
    const email = await linkedAccount('666666666666666666')
    await send(event('discord.member_joined', '666666666666666666', iso(-1000)))

    // Delivered late, but it happened earlier.
    const late = await send(event('discord.member_left', '666666666666666666', iso(-5000)))

    expect(late.status).toBe(204)
    expect((await stored(email)).discordPresent).toBe(true)
  })

  it('verifies the exact bytes, so a pretty-printed body still authenticates', async () => {
    const email = await linkedAccount('777777777777777777')
    const body = JSON.stringify(event('discord.member_left', '777777777777777777'), null, 4)

    const res = await post(body)

    expect(res.status).toBe(204)
    expect((await stored(email)).discordPresent).toBe(false)
  })

  describe('refuses with 401, and changes nothing', () => {
    const cases: [string, (body: string) => ReturnType<typeof post>][] = [
      ['a wrong secret', (body) => post(body, { secret: 'another-secret-entirely' })],
      ['no signature', (body) => post(body, { signature: null })],
      ['a garbage signature', (body) => post(body, { signature: 'not-hex' })],
      [
        'a timestamp outside the 5 minute window',
        (body) => post(body, { signedAt: iso(-6 * 60 * 1000) }),
      ],
      [
        'a body changed after it was signed',
        (body) =>
          post(body.replace('member_left', 'member_joined'), {
            signature: signWebhookPayload(SECRET, iso(), body),
          }),
      ],
    ]

    it.each(cases)('%s', async (_name, run) => {
      // A fresh id per case: the column is unique, and one Discord never links twice.
      const discordId = `8${String(counter + 1).padStart(17, '0')}`
      const email = await linkedAccount(discordId)

      const res = await run(JSON.stringify(event('discord.member_left', discordId)))

      expect(res.status).toBe(401)
      expect((await stored(email)).discordPresent).toBe(true)
    })
  })

  it('refuses a signed event the contract does not know, or with extra fields, with 400', async () => {
    const unknownType = { ...event('discord.member_left', LINKED), type: 'discord.member_banned' }
    const extraField = {
      ...event('discord.member_left', LINKED),
      payload: { discordId: LINKED, nickname: 'x' },
    }
    const notASnowflake = event('discord.member_left', 'not-a-discord-id')

    for (const body of [unknownType, extraField, notASnowflake]) {
      expect((await post(JSON.stringify(body))).status).toBe(400)
    }
  })

  it('needs no session: the signature is the authentication', async () => {
    const res = await send(event('discord.member_left', STRANGER))

    expect(res.status).toBe(204)
  })

  /**
   * 2026-09-23 review: `discord.member_left`/`_joined` are deltas and cannot
   * fix two cases — linked while already outside the server, and anything
   * that happened while the bot was down. The snapshot is sent as ground
   * truth for the instant it was taken, not a delayed fact.
   */
  describe('discord.presence_snapshot (2026-09-23 review)', () => {
    it('marks present a linked account that never sent a member_joined, once it appears in a snapshot', async () => {
      const discordId = '212121212121212121'
      const email = await linkedAccount(discordId)
      expect((await stored(email)).discordPresent).toBe(true) // default, unconfirmed

      const res = await send(snapshot([discordId, '000000000000000001']))

      expect(res.status).toBe(204)
      expect((await stored(email)).discordPresent).toBe(true)
    })

    it('marks absent a linked account missing from the snapshot, with no member_left ever sent', async () => {
      const discordId = '313131313131313131'
      const email = await linkedAccount(discordId)

      const res = await send(snapshot(['000000000000000002', '000000000000000003']))

      expect(res.status).toBe(204)
      expect((await stored(email)).discordPresent).toBe(false)
    })

    it('leaves an unlinked account untouched by an empty snapshot', async () => {
      const email = `presence-unlinked-${++counter}@test.local`
      await request(app.getHttpServer()).post('/api/accounts').send({
        email,
        password: 'a-long-enough-password',
        birthDate: '1990-05-20',
        securityQuestion: 'Qual o nome do seu primeiro time?',
        securityAnswer: 'São Paulo',
        acceptedTermsVersion: CURRENT_TERMS_VERSION,
      })

      // NOT IN never matches a NULL column in SQL — if the update ever
      // dropped the discordIdHash filter, this is what would catch it
      // flipping discordPresent on a row that was never linked.
      await send(snapshot([]))

      expect((await stored(email)).discordPresent).toBe(true)
    })

    it('rewinds nothing on a later real-time event: a fresh snapshot still overrides an older one', async () => {
      const discordId = '515151515151515151'
      const email = await linkedAccount(discordId)
      await send(snapshot([], iso(-2000)))
      expect((await stored(email)).discordPresent).toBe(false)

      await send(snapshot([discordId], iso(-1000)))

      expect((await stored(email)).discordPresent).toBe(true)
    })

    it('refuses an id that is not a snowflake, with 400', async () => {
      const res = await send(snapshot(['not-a-discord-id']))

      expect(res.status).toBe(400)
    })
  })
})
