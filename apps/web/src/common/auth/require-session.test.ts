import { beforeEach, describe, expect, it, vi } from 'vitest'

let session: string | undefined
const apiFetch = vi.fn()
const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`)
})
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        name === 'prolobby_session' && session ? { value: session } : undefined,
      toString: () => 'prolobby_session=jwt',
    }),
  headers: () => Promise.resolve(new Headers()),
}))
vi.mock('next/navigation', () => ({ redirect: (path: string) => redirect(path) }))
vi.mock('@/common/api/client', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }))
// React's per-request cache only dedupes inside a render; here each call is its own request.
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <T>(fn: T) => fn,
}))

import { requireSession } from './require-session'

const answers = (status: number) => apiFetch.mockResolvedValue(new Response('{}', { status }))

describe('requireSession (#296)', () => {
  beforeEach(() => {
    session = undefined
    apiFetch.mockReset()
    redirect.mockClear()
  })

  it('sends a visitor without a session cookie to the login, without asking the API', async () => {
    await expect(requireSession()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('lets a visitor the API accepts through', async () => {
    session = 'jwt'
    answers(200)

    await expect(requireSession()).resolves.toBeUndefined()
    expect(redirect).not.toHaveBeenCalled()
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/accounts/me/club',
      expect.objectContaining({ headers: { cookie: 'prolobby_session=jwt' } }),
    )
  })

  it('sends an expired or invalid session (401) to the login, not into a streamed 200', async () => {
    session = 'jwt'
    answers(401)

    await expect(requireSession()).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it.each([403, 404, 500, 503])(
    'leaves a %i to the page: the account state or a bad day of the API, not the session',
    async (status) => {
      session = 'jwt'
      answers(status)

      await expect(requireSession()).resolves.toBeUndefined()
    },
  )

  it('leaves an unreachable API to the page, which shows its own load error', async () => {
    session = 'jwt'
    apiFetch.mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(requireSession()).resolves.toBeUndefined()
  })
})
