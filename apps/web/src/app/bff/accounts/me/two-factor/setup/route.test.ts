import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetch = vi.fn()
vi.mock('@/common/api/client', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }))

import { POST } from './route'

describe('POST /bff/accounts/me/two-factor/setup (#311)', () => {
  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockResolvedValue(new Response('{}', { status: 200 }))
  })

  it('carries the enrollment code to the API', async () => {
    await POST(
      new Request('http://localhost:3000/bff/accounts/me/two-factor/setup', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'sec-fetch-site': 'same-origin',
          cookie: 'prolobby_session=jwt',
        },
        body: JSON.stringify({ enrollmentCode: 'abcd-efgh' }),
      }),
    )

    const [path, init] = apiFetch.mock.calls[0]!
    expect(path).toBe('/api/accounts/me/two-factor/setup')
    expect(JSON.parse(init.body)).toEqual({ enrollmentCode: 'abcd-efgh' })
    // happy-dom drops a `cookie` header on new Request(); the forwarding is the same code path
    // as the activation proxy, so only the body and its type are checked here.
    expect(init.headers).toMatchObject({ 'content-type': 'application/json' })
  })
})
