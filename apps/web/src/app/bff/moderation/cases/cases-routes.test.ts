// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetch = vi.fn()
vi.mock('@/common/api/client', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }))

import { GET as detail } from './[caseId]/route'
import { POST as close } from './[caseId]/closures/route'
import { GET as list } from './route'
import { GET as summary } from './summary/route'

const ID = '11111111-1111-4111-8111-111111111111'
const ctx = (caseId: string) => ({ params: Promise.resolve({ caseId }) }) as never
const get = (path: string) =>
  new Request(`https://prolobby.test/bff/moderation/cases${path}`, {
    headers: { cookie: 'prolobby_session=jwt' },
  })

/** #309: the panel reaches the API only through these four thin proxies. */
describe('/bff/moderation/cases proxies', () => {
  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockResolvedValue(new Response('[]', { status: 200 }))
  })

  it('forwards the summary with the session cookie', async () => {
    const res = await summary(get('/summary'))

    expect(res.status).toBe(200)
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/moderation/cases/summary',
      expect.objectContaining({ headers: { cookie: 'prolobby_session=jwt' } }),
    )
  })

  it('forwards only the section and type filters, from their closed sets', async () => {
    await list(get('?section=reports&type=user_report&evil=1'))

    expect(apiFetch.mock.calls[0]![0]).toBe(
      '/api/moderation/cases?section=reports&type=user_report',
    )
  })

  it.each(['?section=nope', '?type=nope', '?section=reports&type=<script>'])(
    'refuses %s with 400 before asking the API',
    async (query) => {
      const res = await list(get(query))

      expect(res.status).toBe(400)
      expect(apiFetch).not.toHaveBeenCalled()
    },
  )

  it('forwards a case detail, and 404s an id that is not a UUID', async () => {
    expect((await detail(get(`/${ID}`), ctx(ID))).status).toBe(200)
    expect(apiFetch.mock.calls[0]![0]).toBe(`/api/moderation/cases/${ID}`)

    apiFetch.mockClear()
    expect((await detail(get('/x'), ctx('../../accounts'))).status).toBe(404)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  describe('closing a case', () => {
    const post = (headers: Record<string, string>, caseId = ID) =>
      close(
        new Request(`https://prolobby.test/bff/moderation/cases/${caseId}/closures`, {
          method: 'POST',
          headers,
          body: '{"outcome":"dismissed","reason":"duplicate"}',
        }),
        ctx(caseId),
      )

    it('relays the closure as JSON, with the cookie', async () => {
      apiFetch.mockResolvedValue(new Response(null, { status: 204 }))

      const res = await post({ 'content-type': 'application/json', cookie: 'prolobby_session=jwt' })

      expect(res.status).toBe(204)
      expect(apiFetch).toHaveBeenCalledWith(
        `/api/moderation/cases/${ID}/closures`,
        expect.objectContaining({
          method: 'POST',
          body: '{"outcome":"dismissed","reason":"duplicate"}',
        }),
      )
    })

    it('relays a 409 as it is', async () => {
      apiFetch.mockResolvedValue(new Response('{}', { status: 409 }))

      expect((await post({ 'content-type': 'application/json' })).status).toBe(409)
    })

    it.each([
      ['a text/plain form', { 'content-type': 'text/plain' }],
      [
        'a cross-site fetch',
        { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' },
      ],
    ])('refuses %s with 403', async (_name, headers) => {
      expect((await post(headers)).status).toBe(403)
      expect(apiFetch).not.toHaveBeenCalled()
    })

    it('404s an id that is not a UUID', async () => {
      expect((await post({ 'content-type': 'application/json' }, 'abc')).status).toBe(404)
      expect(apiFetch).not.toHaveBeenCalled()
    })
  })
})
