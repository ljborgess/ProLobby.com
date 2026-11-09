import { beforeEach, describe, expect, it, vi } from 'vitest'

let session: string | undefined
const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`)
})
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        name === 'prolobby_session' && session ? { value: session } : undefined,
    }),
}))
vi.mock('next/navigation', () => ({ redirect: (path: string) => redirect(path) }))

import { requireSession } from './require-session'

describe('requireSession (#296)', () => {
  beforeEach(() => {
    session = undefined
    redirect.mockClear()
  })

  it('sends a visitor without a session to the login', async () => {
    await expect(requireSession()).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it('lets a signed-in visitor through', async () => {
    session = 'jwt'
    await expect(requireSession()).resolves.toBeUndefined()
    expect(redirect).not.toHaveBeenCalled()
  })
})
