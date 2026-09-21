// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetch = vi.fn()
vi.mock('@/common/api/client', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }))

import { GET } from './route'

const call = (query: string, cookie?: string) =>
  GET(
    new Request(`https://prolobby.test/bff/discord/callback${query}`, {
      headers: cookie ? { cookie } : undefined,
    }),
  )

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('GET /bff/discord/callback', () => {
  beforeEach(() => {
    apiFetch.mockReset()
  })

  it('forwards code and state to the API as a PUT, with the session cookie', async () => {
    apiFetch.mockResolvedValue(new Response(null, { status: 204 }))

    const res = await call('?code=abc1234567&state=stateabcdefghijk', 'session=jwt')

    const [path, init] = apiFetch.mock.calls[0]!
    expect(path).toBe('/api/accounts/me/discord-link')
    expect(init.method).toBe('PUT')
    expect(init.headers.cookie).toBe('session=jwt')
    expect(JSON.parse(init.body)).toEqual({ code: 'abc1234567', state: expect.any(String) })
    expect(res.headers.get('location')).toBe('/account/discord?status=linked')
  })

  it('redirects with a relative Location, so the internal host never leaks', async () => {
    apiFetch.mockResolvedValue(new Response(null, { status: 204 }))

    const res = await call('?code=abc1234567&state=xyz')

    expect(res.status).toBe(303)
    expect(res.headers.get('location')?.startsWith('/')).toBe(true)
  })

  it('never puts the code or the state in the redirect, and turns off the referrer', async () => {
    apiFetch.mockResolvedValue(new Response(null, { status: 204 }))

    const res = await call('?code=SECRETCODE12&state=SECRETSTATE1')

    expect(res.headers.get('location')).not.toMatch(/SECRET/)
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    // The referrer policy that protects the `code` is global (next.config.ts),
    // so it is asserted end to end in e2e/account-flow.spec.ts — a header set
    // in this handler never reaches the wire.
  })

  it.each([
    [400, { message: 'invalid_state' }, 'invalid_state'],
    [403, { message: 'discord_link_blocked' }, 'blocked'],
    [409, { message: 'discord_already_linked' }, 'already_linked'],
    [409, { message: 'account_already_linked' }, 'account_already_linked'],
    [503, { message: 'discord_link_unavailable' }, 'unavailable'],
    [500, { message: 'boom' }, 'error'],
  ])('maps API %s %j to status=%s', async (httpStatus, body, expected) => {
    apiFetch.mockResolvedValue(json(httpStatus, body))

    const res = await call('?code=abc1234567&state=xyz')

    expect(res.headers.get('location')).toBe(`/account/discord?status=${expected}`)
  })

  it('sends a signed-out visitor to the login screen', async () => {
    apiFetch.mockResolvedValue(json(401, { message: 'Unauthorized' }))

    const res = await call('?code=abc1234567&state=xyz')

    expect(res.headers.get('location')).toBe('/login')
  })

  it('treats "cancel" on the Discord screen as denied, without calling the API', async () => {
    const res = await call('?error=access_denied&state=xyz')

    expect(apiFetch).not.toHaveBeenCalled()
    expect(res.headers.get('location')).toBe('/account/discord?status=denied')
  })

  it('does not call the API when code or state is missing', async () => {
    const res = await call('?code=abc1234567')

    expect(apiFetch).not.toHaveBeenCalled()
    expect(res.headers.get('location')).toBe('/account/discord?status=error')
  })

  it('answers error, not a crash, when the API cannot be reached', async () => {
    apiFetch.mockRejectedValue(new TypeError('fetch failed'))

    const res = await call('?code=abc1234567&state=xyz')

    expect(res.headers.get('location')).toBe('/account/discord?status=error')
  })
})
