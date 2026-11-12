// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetch = vi.fn()
vi.mock('@/common/api/client', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }))

import { GET } from './route'

describe('GET /bff/health', () => {
  beforeEach(() => {
    apiFetch.mockReset()
  })

  it('relays the API health check: 200 with the "status":"ok" keyword', async () => {
    apiFetch.mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const res = await GET()

    expect(apiFetch.mock.calls[0]![0]).toBe('/api/health')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('"status":"ok"')
  })

  it('reports 502 when the API is unreachable, never a 2xx', async () => {
    apiFetch.mockRejectedValue(new TypeError('fetch failed'))

    const res = await GET()

    expect(res.status).toBe(502)
    expect(await res.text()).not.toContain('"status":"ok"')
  })
})
