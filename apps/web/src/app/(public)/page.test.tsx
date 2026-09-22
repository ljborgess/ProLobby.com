import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { ACCOUNT_CONTENT } from '@/content/account'

const cookieJar = { get: vi.fn(), toString: () => 'prolobby_session=jwt' }
const apiFetch = vi.fn()

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieJar),
  headers: () => Promise.resolve(new Headers()),
}))
vi.mock('@/common/api/client', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }))

import Home from './page'

const signedIn = () => cookieJar.get.mockReturnValue({ name: 'prolobby_session', value: 'jwt' })
const anonymous = () => cookieJar.get.mockReturnValue(undefined)
const answers = (status: number, body: unknown) =>
  apiFetch.mockResolvedValue(new Response(JSON.stringify(body), { status }))

/** Issue #171: the home is where a signed-in person finds out what is missing. */
describe('Home', () => {
  beforeEach(() => {
    cookieJar.get.mockReset()
    apiFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the visitor buttons and calls no API when there is no session', async () => {
    anonymous()

    renderWithLocale(await Home())

    expect(screen.getByRole('link', { name: 'Criar conta' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('shows what is still missing when there is a session', async () => {
    signedIn()
    answers(200, { emailVerified: true, discordLinked: false })

    renderWithLocale(await Home())

    expect(screen.getByText(ACCOUNT_CONTENT.pt.title)).toBeInTheDocument()
    expect(screen.getByText(ACCOUNT_CONTENT.pt.email.doneLabel)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: ACCOUNT_CONTENT.pt.discord.action })).toHaveAttribute(
      'href',
      '/account/discord',
    )
    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull()
  })

  it.each([
    ['a suspended, banned or terms-pending account', 403],
    ['an expired session', 401],
    ['an API error', 500],
  ])('falls back to the visitor home on %s', async (_name, status) => {
    signedIn()
    answers(status, { message: 'nope' })

    renderWithLocale(await Home())

    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.queryByText(ACCOUNT_CONTENT.pt.title)).toBeNull()
  })

  it('falls back to the visitor home when the API is unreachable', async () => {
    signedIn()
    apiFetch.mockRejectedValue(new TypeError('fetch failed'))

    renderWithLocale(await Home())

    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('asks the API not to cache, because the answer carries a session', async () => {
    signedIn()
    answers(200, { emailVerified: false, discordLinked: false })

    await Home()

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/accounts/me/queue-prerequisites',
      expect.objectContaining({ cache: 'no-store' }),
    )
  })
})
