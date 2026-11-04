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
 * The home is a landing, never a dashboard (routing change of 2026-09-22): the
 * signed-in area is /verifications, where login sends people. Since
 * 2026-10-29 a signed-in visitor sees the landing too, with the account in
 * place of the sign-up doors.
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

    // One of each with these exact names, in the top bar. The close repeats
    // the offer on purpose (2026-10-29) under its own words, "Criar minha
    // conta" and "Já tenho conta"; a second identical name would make
    // `getByRole` throw.
    expect(screen.getByRole('link', { name: 'Criar conta' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('shows the landing to a signed-in visitor too, with the account instead of sign-up', async () => {
    signedIn()

    renderWithLocale(await Home())

    // The logo is the way home from inside the app (2026-10-29): this page no
    // longer bounces a session away, it swaps the doors.
    expect(screen.getByRole('link', { name: 'Minha conta' })).toHaveAttribute(
      'href',
      '/verifications',
    )
    expect(screen.queryByRole('link', { name: 'Criar conta' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Ir pra fila' })).toHaveAttribute('href', '/queue')
    expect(redirect).not.toHaveBeenCalled()
  })
})
