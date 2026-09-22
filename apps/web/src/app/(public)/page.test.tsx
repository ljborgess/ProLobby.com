import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'

const cookieJar = { get: vi.fn() }
const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`)
})

vi.mock('next/headers', () => ({ cookies: () => Promise.resolve(cookieJar) }))
vi.mock('next/navigation', () => ({ redirect: (path: string) => redirect(path) }))

import Home from './page'

const signedIn = () => cookieJar.get.mockReturnValue({ name: 'prolobby_session', value: 'jwt' })
const anonymous = () => cookieJar.get.mockReturnValue(undefined)

/**
 * Routing change of 2026-09-22: the home is a pure landing now, never a
 * dashboard. The signed-in area moved to /verifications, which is where login
 * sends people and where this page sends anyone it finds already signed in.
 */
describe('Home', () => {
  beforeEach(() => {
    cookieJar.get.mockReset()
    redirect.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the visitor buttons when there is no session', async () => {
    anonymous()

    renderWithLocale(await Home())

    // Exactly one of each, in the top bar: the hero's duplicate pair was
    // dropped on 2026-09-22, and `getByRole` throwing on a second match is
    // what keeps it from creeping back.
    expect(screen.getByRole('link', { name: 'Criar conta' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('sends a signed-in visitor to /verifications instead of showing the landing', async () => {
    signedIn()

    await expect(Home()).rejects.toThrow('NEXT_REDIRECT:/verifications')
  })
})
