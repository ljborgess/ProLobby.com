import { BadGatewayException } from '@nestjs/common'

import { HttpDiscordOAuth } from './discord-oauth'

const oauth = new HttpDiscordOAuth({
  clientId: '123',
  clientSecret: 'client-secret-value',
  redirectUri: 'http://localhost:3000/bff/discord/callback',
})

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

describe('HttpDiscordOAuth', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('asks for the identify scope and nothing else, with PKCE S256', () => {
    const url = new URL(oauth.authorizationUrl('state-value', 'challenge-value'))

    expect(url.searchParams.get('scope')).toBe('identify')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBe('challenge-value')
    expect(url.searchParams.get('client_secret')).toBeNull()
  })

  it('returns the Discord id and reads nothing else from the profile', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(json({ access_token: 'tok' }))
      .mockResolvedValueOnce(json({ id: '111111111111111111', email: 'a@b.c' }))

    await expect(oauth.userIdFor('code', 'verifier')).resolves.toBe('111111111111111111')
  })

  it.each([
    ['a dropped connection', () => Promise.reject(new TypeError('fetch failed'))],
    ['a timeout', () => Promise.reject(new DOMException('timed out', 'TimeoutError'))],
    ['a body that is not JSON', () => Promise.resolve(new Response('<html>', { status: 200 }))],
    ['an error status', () => Promise.resolve(json({ error: 'invalid_grant' }, 400))],
  ])('answers 502, not 500, on %s', async (_name, respond) => {
    jest.spyOn(global, 'fetch').mockImplementation(respond)

    await expect(oauth.userIdFor('code', 'verifier')).rejects.toBeInstanceOf(BadGatewayException)
  })

  it('refuses an id that is not a snowflake, instead of hashing it', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(json({ access_token: 'tok' }))
      .mockResolvedValueOnce(json({ id: 'not-a-snowflake' }))

    await expect(oauth.userIdFor('code', 'verifier')).rejects.toBeInstanceOf(BadGatewayException)
  })

  it('never puts the client secret or the token in the error it throws', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(json({ error: 'nope' }, 401))

    const error = await oauth.userIdFor('code', 'verifier').catch((e: unknown) => e)

    expect(JSON.stringify(error)).not.toContain('client-secret-value')
    expect(String((error as Error).message)).not.toContain('client-secret-value')
  })
})
