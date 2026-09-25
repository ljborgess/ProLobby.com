// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetch = vi.fn()
vi.mock('@/common/api/client', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }))

import { POST as signUp } from './accounts/route'
import { POST as startDiscordLink } from './accounts/me/discord-link/attempts/route'
import { POST as resendVerification } from './accounts/me/verifications/resends/route'
import { POST as confirmPasswordReset } from './accounts/password-resets/confirmations/route'
import { POST as requestPasswordReset } from './accounts/password-resets/route'
import { POST as verifyEmail } from './accounts/verifications/route'
import { POST as sendPrint } from './characters/[id]/prints/route'
import { POST as createCharacter } from './characters/route'
import { DELETE as signOut, POST as signIn } from './sessions/route'

const BODY = '{"email":"atk@example.com","password":"a=long-enough-password"}'

const post = (
  handler: (request: Request) => Promise<Response>,
  headers: Record<string, string>,
  body: string | undefined = BODY,
) => handler(new Request('https://prolobby.test/bff/x', { method: 'POST', headers, body }))

/**
 * Audit of 2026-09-21: a page on any site could post a `text/plain` form whose
 * body was valid JSON, and the proxy forwarded it to the API as JSON — a login
 * CSRF, confirmed against the running app, that `SameSite: lax` does not cover.
 */
describe('the /bff proxies refuse requests from other sites', () => {
  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockResolvedValue(new Response('{}', { status: 200 }))
  })

  it.each([
    ['sign-in', signIn],
    ['sign-up', signUp],
    ['verify email', verifyEmail],
    ['request password reset', requestPasswordReset],
    ['confirm password reset', confirmPasswordReset],
    ['create character', createCharacter],
  ])('%s refuses the text/plain form that carried the attack', async (_name, handler) => {
    const res = await post(handler, { 'content-type': 'text/plain' })

    expect(res.status).toBe(403)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it.each([
    ['sign-in', signIn],
    ['sign-up', signUp],
    ['verify email', verifyEmail],
    ['request password reset', requestPasswordReset],
    ['confirm password reset', confirmPasswordReset],
    ['create character', createCharacter],
  ])('%s refuses a cross-site fetch even with a JSON body', async (_name, handler) => {
    const res = await post(handler, {
      'content-type': 'application/json',
      'sec-fetch-site': 'cross-site',
    })

    expect(res.status).toBe(403)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('refuses a same-site but different-origin caller too (a subdomain is not this app)', async () => {
    const res = await post(signIn, {
      'content-type': 'application/json',
      'sec-fetch-site': 'same-site',
    })

    expect(res.status).toBe(403)
  })

  it('refuses a cross-site start of the Discord link, which has no body', async () => {
    const res = await post(startDiscordLink, { 'sec-fetch-site': 'cross-site' }, undefined)

    expect(res.status).toBe(403)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  /**
   * Missing until the 2026-09-23 review: the route already called
   * `rejectCrossSite`, but nothing broke when a future edit removed it — a
   * CSRF guard the comment above warns about going missing silently.
   */
  it('refuses a cross-site resend of the verification email, which has no body', async () => {
    const res = await post(resendVerification, { 'sec-fetch-site': 'cross-site' }, undefined)

    expect(res.status).toBe(403)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it.each([
    ['same-origin', 'same-origin'],
    ['a typed URL', 'none'],
  ])('lets %s through', async (_name, site) => {
    const res = await post(signIn, { 'content-type': 'application/json', 'sec-fetch-site': site })

    expect(res.status).toBe(200)
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('lets the app’s own Discord button through, with no body', async () => {
    const res = await post(startDiscordLink, { 'sec-fetch-site': 'same-origin' }, undefined)

    expect(res.status).toBe(200)
  })

  it('lets the app’s own resend of the verification email through, with no body', async () => {
    const res = await post(resendVerification, { 'sec-fetch-site': 'same-origin' }, undefined)

    expect(res.status).toBe(200)
  })

  /**
   * Sign-out landed on 2026-09-22 without a case here, which is how a CSRF
   * guard quietly goes missing: nothing breaks when someone deletes it. A
   * forced sign-out is a nuisance rather than a breach, but the rule is that
   * every state-changing /bff route refuses another site, with no exceptions
   * to remember.
   */
  it('refuses a cross-site sign-out', async () => {
    const res = await signOut(
      new Request('https://prolobby.test/bff/sessions', {
        method: 'DELETE',
        headers: { 'sec-fetch-site': 'cross-site' },
      }),
    )

    expect(res.status).toBe(403)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('lets the app’s own sign-out through', async () => {
    const res = await signOut(
      new Request('https://prolobby.test/bff/sessions', {
        method: 'DELETE',
        headers: { 'sec-fetch-site': 'same-origin' },
      }),
    )

    expect(res.status).toBe(200)
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })
})

describe('the print upload proxy', () => {
  const ID = '11111111-1111-1111-1111-111111111111'
  const upload = (headers: Record<string, string>, id = ID) =>
    sendPrint(
      new Request(`https://prolobby.test/bff/characters/${id}/prints`, {
        method: 'POST',
        headers,
        body: 'x',
      }),
      { params: Promise.resolve({ id }) },
    )
  const ok = { 'sec-fetch-site': 'same-origin', cookie: 's=1', 'content-length': '1' }

  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockResolvedValue(new Response('{}', { status: 201 }))
  })

  it('refuses another site', async () => {
    const res = await upload({ ...ok, 'sec-fetch-site': 'cross-site' })

    expect(res.status).toBe(403)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('never puts an id that is not a UUID into the API path', async () => {
    const res = await upload(ok, '..%2F..%2Faccounts')

    expect(res.status).toBe(404)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('refuses without a session before reading the body', async () => {
    const anonymous = { 'sec-fetch-site': 'same-origin', 'content-length': '1' }

    expect((await upload(anonymous)).status).toBe(401)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('refuses a body past 10 MB, or one that does not say its size', async () => {
    expect((await upload({ ...ok, 'content-length': String(11 * 1024 * 1024) })).status).toBe(413)
    const unsized = { 'sec-fetch-site': 'same-origin', cookie: 's=1' }
    expect((await upload(unsized)).status).toBe(413)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('lets the app’s own upload through', async () => {
    expect((await upload(ok)).status).toBe(201)
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })
})

describe('the /bff proxies when the API is unreachable', () => {
  it('answer 502 api_unavailable instead of a bare 500', async () => {
    apiFetch.mockReset()
    apiFetch.mockRejectedValue(new TypeError('fetch failed'))

    const res = await post(signIn, {
      'content-type': 'application/json',
      'sec-fetch-site': 'same-origin',
    })

    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ message: 'api_unavailable' })
    expect(res.headers.get('cache-control')).toBe('private, no-store')
  })

  it('never answer 503, which sign-up reads as "sign-up paused" and shows as success', async () => {
    apiFetch.mockReset()
    apiFetch.mockRejectedValue(new TypeError('fetch failed'))

    const res = await post(signUp, { 'content-type': 'application/json' })

    expect(res.status).not.toBe(503)
  })
})
