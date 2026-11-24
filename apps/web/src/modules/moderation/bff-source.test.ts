import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBffCasesSource, createBffToolsSource } from './bff-source'

const fetchMock = vi.fn()
const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status })
const lastCall = () => fetchMock.mock.calls.at(-1) as [string, RequestInit | undefined]

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('the panel reads the API through /bff/moderation', () => {
  it('lists only the types that have cases open', async () => {
    fetchMock.mockResolvedValue(
      json(200, {
        sections: [
          {
            key: 'reports',
            open: 1,
            types: [
              { type: 'user_report', open: 1 },
              { type: 'captain_abuse', open: 0 },
            ],
          },
        ],
      }),
    )

    const [reports] = await createBffCasesSource().summary()

    expect(reports!.types).toEqual([{ type: 'user_report', open: 1 }])
  })

  it('sends the section and type as a query, and none when there is no filter', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(200, [])))
    const cases = createBffCasesSource()

    await cases.list('reports', 'user_report')
    expect(lastCall()[0]).toBe('/bff/moderation/cases?section=reports&type=user_report')
    await cases.list(null, null)
    expect(lastCall()[0]).toBe('/bff/moderation/cases')
  })

  it('answers null for a case that is not there, and throws on any other failure', async () => {
    const cases = createBffCasesSource()
    fetchMock.mockResolvedValueOnce(json(404, { message: 'case_not_found' }))
    expect(await cases.detail('c1')).toBeNull()

    fetchMock.mockResolvedValueOnce(json(500))
    await expect(cases.detail('c1')).rejects.toThrow()
  })

  it.each([
    [204, undefined, 'closed'],
    [409, { message: 'case_already_closed' }, 'already_closed'],
    [409, { message: 'use_verification_flow' }, 'failed'],
    [400, { message: 'reason_not_for_outcome' }, 'failed'],
  ])('a closure answered %i is "%s"', async (status, body, expected) => {
    fetchMock.mockResolvedValue(json(status, body))

    const result = await createBffCasesSource().close('c1', {
      outcome: 'resolved',
      reason: 'confirmed',
    })

    expect(result).toBe(expected)
    expect(lastCall()[0]).toBe('/bff/moderation/cases/c1/closures')
    expect(lastCall()[1]?.method).toBe('POST')
  })

  it('searches players with ?q, and not at all for a term too short', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(200, [])))
    const tools = createBffToolsSource()

    expect(await tools.searchPlayers(' a ')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
    await tools.searchPlayers(' borges ')
    expect(lastCall()[0]).toBe('/bff/moderation/players?q=borges')
  })

  it('sends only the audit filters that are filled in, and the cursor as `before`', async () => {
    fetchMock.mockResolvedValue(json(200, { entries: [], next: null }))

    await createBffToolsSource().audit(
      { actor: '', action: 'case_resolved', account: '' },
      '2026-11-10T12:00:00.000Z_00000000-0000-4000-9000-000000000001',
    )

    const url = new URL(lastCall()[0], 'https://x.test')
    expect(url.pathname).toBe('/bff/moderation/audit')
    expect([...url.searchParams.keys()].sort()).toEqual(['action', 'before'])
  })

  it('sends the plan without a PIX when it is revoked, and says why a change was refused', async () => {
    const tools = createBffToolsSource()
    fetchMock.mockResolvedValue(json(201, {}))
    expect(await tools.setPlan('p1', 'none', 'ignored')).toBe('ok')
    expect(JSON.parse(String(lastCall()[1]?.body))).toEqual({ plan: 'none' })

    await tools.setPlan('p1', 'founder', 'E2026PIX')
    expect(JSON.parse(String(lastCall()[1]?.body))).toEqual({
      plan: 'founder',
      pixReference: 'E2026PIX',
    })

    for (const [status, message, expected] of [
      [403, 'admin_only', 'forbidden'],
      [409, 'account_closed', 'account_closed'],
      [409, 'already_founder', 'already_founder'],
      [400, 'Bad Request', 'failed'],
    ] as const) {
      fetchMock.mockImplementation(() => Promise.resolve(json(status, { message })))
      expect(await tools.setPlan('p1', 'supporter', 'E2026PIX')).toBe(expected)
    }
  })
})
