// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetch = vi.fn()
vi.mock('@/common/api/client', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }))

import { POST as signUp } from './accounts/route'
import { POST as startDiscordLink } from './discord-links/route'
import { POST as signIn } from './sessions/route'

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
  ])('%s refuses the text/plain form that carried the attack', async (_name, handler) => {
    const res = await post(handler, { 'content-type': 'text/plain' })

    expect(res.status).toBe(403)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it.each([
    ['sign-in', signIn],
    ['sign-up', signUp],
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
