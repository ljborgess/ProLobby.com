import { MikroORM } from '@mikro-orm/postgresql'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { randomBytes } from 'node:crypto'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { hashIdentity, readIdentityHmacSecret } from '../src/common/security/identity-hmac'
import { applySecurity } from '../src/common/security/security.config'
import { SESSION_COOKIE_NAME } from '../src/common/security/session-cookie'
import { Account } from '../src/modules/account/account.entity'
import { AccountState } from '../src/modules/account/account.enums'
import { DiscordLinkState } from '../src/modules/account/discord-link-state.entity'
import { DiscordOAuth } from '../src/modules/account/discord-oauth'
import { CURRENT_TERMS_VERSION } from '../src/modules/account/terms.constants'
import { BlockedIdentity } from '../src/modules/moderation/blocked-identity.entity'

/**
 * Stands in for Discord: the "authorization code" *is* the Discord user id, so
 * a test decides who "logged in" by choosing the code.
 */
class FakeDiscord extends DiscordOAuth {
  lastVerifier?: string
  authorizationUrl(state: string, codeChallenge: string): string {
    return `https://discord.test/authorize?state=${state}&code_challenge=${codeChallenge}&scope=identify`
  }
  userIdFor(code: string, codeVerifier: string): Promise<string> {
    this.lastVerifier = codeVerifier
    return Promise.resolve(code)
  }
}

const PASSWORD = 'a-long-enough-password'
const DISCORD_A = '111111111111111111'
const DISCORD_B = '222222222222222222'
const DISCORD_BANNED = '333333333333333333'

describe('Discord link (#149)', () => {
  let app: INestApplication
  let orm: MikroORM
  const discord = new FakeDiscord()
  let counter = 0

  const cookieOf = (res: request.Response): string => {
    const header = res.headers['set-cookie']
    const cookies = Array.isArray(header) ? header : [header]
    return cookies.find((cookie) => cookie?.startsWith(SESSION_COOKIE_NAME)) ?? ''
  }

  /** A signed-in account in the given state; returns its session cookie and email. */
  const account = async (state = AccountState.ACTIVE) => {
    const email = `link-${++counter}@test.local`
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
    row.state = state
    await em.flush()
    const res = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ email, password: PASSWORD })
    return { cookie: cookieOf(res), email }
  }

  const start = async (cookie: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/accounts/discord-links')
      .set('Cookie', cookie)
    expect(res.status).toBe(201)
    return new URL(res.body.authorizationUrl).searchParams.get('state') as string
  }

  const complete = (cookie: string, state: string, code: string) =>
    request(app.getHttpServer())
      .post('/api/accounts/discord-links/callbacks')
      .set('Cookie', cookie)
      .send({ state, code })

  const stored = async (email: string) => orm.em.fork().findOneOrFail(Account, { email })

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true'
    process.env.JWT_SECRET ??= 'test-secret-not-the-placeholder'
    process.env.EVIDENCE_ENCRYPTION_KEY ??= randomBytes(32).toString('base64')
    process.env.IDENTITY_HMAC_SECRET ??= randomBytes(32).toString('base64')

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DiscordOAuth)
      .useValue(discord)
      .compile()

    app = moduleRef.createNestApplication()
    applySecurity(app)
    await app.init()

    orm = moduleRef.get(MikroORM)
    await orm.getSchemaGenerator().refreshDatabase()

    const em = orm.em.fork()
    em.create(BlockedIdentity, {
      discordIdHash: hashIdentity(readIdentityHmacSecret(), DISCORD_BANNED),
      reason: 'test ban',
    })
    await em.flush()
  }, 60_000)

  afterAll(async () => {
    delete process.env.THROTTLE_DISABLED
    await app.close()
  })

  it('links the Discord account and stores only the hash and the ciphertext', async () => {
    const { cookie, email } = await account()
    const state = await start(cookie)

    const res = await complete(cookie, state, DISCORD_A)

    expect(res.status).toBe(204)
    const row = await stored(email)
    expect(row.discordIdHash).toBe(hashIdentity(readIdentityHmacSecret(), DISCORD_A))
    expect(row.discordIdEncrypted).toBeDefined()
    expect(Buffer.from(row.discordIdEncrypted as Buffer).includes(DISCORD_A)).toBe(false)
  })

  it('sends the PKCE verifier that matches the challenge in the URL', async () => {
    const { cookie } = await account()
    const res = await request(app.getHttpServer())
      .post('/api/accounts/discord-links')
      .set('Cookie', cookie)
    const url = new URL(res.body.authorizationUrl)

    await complete(cookie, url.searchParams.get('state') as string, DISCORD_B)

    const { createHash } = await import('node:crypto')
    expect(
      createHash('sha256')
        .update(discord.lastVerifier as string)
        .digest('base64url'),
    ).toBe(url.searchParams.get('code_challenge'))
  })

  it('links with an unverified email, and needs no character (RF-055)', async () => {
    const { cookie } = await account(AccountState.UNVERIFIED)
    const state = await start(cookie)

    expect((await complete(cookie, state, '444444444444444444')).status).toBe(204)
  })

  it('refuses a second account taking a Discord that is already linked', async () => {
    const first = await account()
    await complete(first.cookie, await start(first.cookie), '555555555555555555')

    const second = await account()
    const res = await complete(second.cookie, await start(second.cookie), '555555555555555555')

    expect(res.status).toBe(409)
    expect(res.body.message).toBe('discord_already_linked')
    expect(JSON.stringify(res.body)).not.toContain(first.email)
    expect((await stored(second.email)).discordIdHash).toBeNull()
  })

  it('answers 204 and writes nothing when the same Discord is linked again', async () => {
    const { cookie, email } = await account()
    await complete(cookie, await start(cookie), '666666666666666666')
    const before = (await stored(email)).discordIdEncrypted

    const res = await complete(cookie, await start(cookie), '666666666666666666')

    expect(res.status).toBe(204)
    expect(
      Buffer.compare((await stored(email)).discordIdEncrypted as Buffer, before as Buffer),
    ).toBe(0)
  })

  it('refuses to swap a linked account to another Discord — unlinking is moderation (RF-082)', async () => {
    const { cookie } = await account()
    await complete(cookie, await start(cookie), '777777777777777777')

    const res = await complete(cookie, await start(cookie), '888888888888888888')

    expect(res.status).toBe(409)
    expect(res.body.message).toBe('account_already_linked')
  })

  it('refuses a banned Discord, without saying which identity tripped it', async () => {
    const { cookie, email } = await account()

    const res = await complete(cookie, await start(cookie), DISCORD_BANNED)

    expect(res.status).toBe(403)
    expect(res.body.message).toBe('discord_link_blocked')
    expect(JSON.stringify(res.body).toLowerCase()).not.toContain('gamertag')
    expect((await stored(email)).discordIdHash).toBeNull()
  })

  describe('state', () => {
    it('is single use', async () => {
      const { cookie } = await account()
      const state = await start(cookie)
      await complete(cookie, state, '999999999999999991')

      const replay = await complete(cookie, state, '999999999999999991')

      expect(replay.status).toBe(400)
      expect(replay.body.message).toBe('invalid_state')
    })

    it('is refused when it never existed', async () => {
      const { cookie } = await account()

      const res = await complete(cookie, randomBytes(32).toString('base64url'), DISCORD_A)

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('invalid_state')
    })

    it('is refused when expired', async () => {
      const { cookie, email } = await account()
      const state = await start(cookie)
      const em = orm.em.fork()
      const owner = await em.findOneOrFail(Account, { email })
      await em.nativeUpdate(
        DiscordLinkState,
        { account: owner.id },
        { expiresAt: new Date(Date.now() - 1000) },
      )

      const res = await complete(cookie, state, DISCORD_A)

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('invalid_state')
    })

    it('is refused when another account redeems it (bound to the session that started it)', async () => {
      const owner = await account()
      const thief = await account()
      const state = await start(owner.cookie)

      const res = await complete(thief.cookie, state, '999999999999999992')

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('invalid_state')
    })

    it('is not stored in the clear', async () => {
      const { cookie } = await account()
      const state = await start(cookie)

      const rows = await orm.em.fork().find(DiscordLinkState, {})

      expect(rows.some((row) => row.stateHash === state)).toBe(false)
    })
  })

  it('needs a session', async () => {
    const res = await request(app.getHttpServer()).post('/api/accounts/discord-links')

    expect(res.status).toBe(401)
  })
})
