// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetch = vi.fn()
vi.mock('@/common/api/client', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }))

import { GET as audit } from './audit/route'
import { GET as caseOf } from './cases/[caseId]/route'
import { POST as close } from './cases/[caseId]/closures/route'
import { GET as cases } from './cases/route'
import { GET as summary } from './cases/summary/route'
import { GET as metrics } from './metrics/route'
import { POST as setPlan } from './players/[accountId]/plan/route'
import { GET as player } from './players/[accountId]/route'
import { GET as players } from './players/route'

const ID = '00000000-0000-4000-9000-000000000001'
const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) }) as never
const get = (path: string) =>
  new Request(`https://prolobby.test${path}`, { headers: { cookie: 'prolobby_session=jwt' } })
const post = (headers: Record<string, string>) =>
  new Request('https://prolobby.test/bff/x', {
    method: 'POST',
    headers: { cookie: 'prolobby_session=jwt', ...headers },
    body: '{"plan":"none"}',
  })

beforeEach(() => {
  apiFetch.mockReset()
  apiFetch.mockResolvedValue(new Response('{}', { status: 200 }))
})

describe('the /bff/moderation proxies', () => {
  it.each([
    [
      'summary',
      () => summary(get('/bff/moderation/cases/summary')),
      '/api/moderation/cases/summary',
    ],
    [
      'list',
      () => cases(get('/bff/moderation/cases?section=reports')),
      '/api/moderation/cases?section=reports',
    ],
    [
      'audit',
      () => audit(get('/bff/moderation/audit?action=case_resolved')),
      '/api/moderation/audit?action=case_resolved',
    ],
    ['metrics', () => metrics(get('/bff/moderation/metrics')), '/api/moderation/metrics'],
    ['search', () => players(get('/bff/moderation/players?q=ab')), '/api/moderation/players?q=ab'],
    ['case', () => caseOf(get('/x'), ctx({ caseId: ID })), `/api/moderation/cases/${ID}`],
    ['player', () => player(get('/x'), ctx({ accountId: ID })), `/api/moderation/players/${ID}`],
  ])('%s carries the session cookie to the API, uncached', async (_name, call, path) => {
    await call()

    const [calledPath, init] = apiFetch.mock.calls[0]!
    expect(calledPath).toBe(path)
    expect(init.headers).toEqual({ cookie: 'prolobby_session=jwt' })
    expect(init.cache).toBe('no-store')
  })

  it('answers 404 to an id that is not a UUID, without asking the API', async () => {
    expect((await caseOf(get('/x'), ctx({ caseId: 'nope' }))).status).toBe(404)
    expect((await player(get('/x'), ctx({ accountId: '1; drop' }))).status).toBe(404)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it.each([
    ['closure', (h: Record<string, string>) => close(post(h), ctx({ caseId: ID }))],
    ['plan', (h: Record<string, string>) => setPlan(post(h), ctx({ accountId: ID }))],
  ])('the %s refuses a cross-site or non-JSON call before sending anything', async (_n, call) => {
    expect((await call({ 'content-type': 'text/plain' })).status).toBe(403)
    expect(
      (await call({ 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' })).status,
    ).toBe(403)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('passes a JSON closure and plan change on, with the API answer unchanged', async () => {
    apiFetch.mockResolvedValue(
      new Response(JSON.stringify({ message: 'admin_only' }), { status: 403 }),
    )

    const response = await setPlan(
      post({ 'content-type': 'application/json' }),
      ctx({ accountId: ID }),
    )

    expect(response.status).toBe(403)
    expect(apiFetch.mock.calls[0]![0]).toBe(`/api/moderation/players/${ID}/plan`)
    expect(apiFetch.mock.calls[0]![1].method).toBe('POST')
  })
})
