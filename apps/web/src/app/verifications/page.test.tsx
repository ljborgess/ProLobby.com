import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { ACCOUNT_CONTENT } from '@/content/account'

const cookieJar = { get: vi.fn(), toString: () => 'prolobby_session=jwt' }
const apiFetch = vi.fn()
const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`)
})

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieJar),
  headers: () => Promise.resolve(new Headers()),
}))
// `useRouter` is here for the sign-out button the page renders (added
// 2026-09-22); the page itself only ever calls `redirect`.
vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirect(path),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/common/api/client', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }))

import VerificationsPage from './page'

const signedIn = () => cookieJar.get.mockReturnValue({ name: 'prolobby_session', value: 'jwt' })
const anonymous = () => cookieJar.get.mockReturnValue(undefined)
const answers = (status: number, body: unknown) =>
  apiFetch.mockResolvedValue(new Response(JSON.stringify(body), { status }))

/**
 * Where login lands since the routing change of 2026-09-22 (issue #171's
 * panel, moved off the home).
 */
describe('VerificationsPage', () => {
  beforeEach(() => {
    cookieJar.get.mockReset()
    apiFetch.mockReset()
    redirect.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('redirects to login without calling the API when there is no session cookie', async () => {
    anonymous()

    await expect(VerificationsPage()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('shows the panel when the API answers cleanly', async () => {
    signedIn()
    answers(200, { emailVerified: false, discordLinked: false })

    renderWithLocale(await VerificationsPage())

    expect(screen.getByText(ACCOUNT_CONTENT.pt.title)).toBeInTheDocument()
    expect(screen.getByText(ACCOUNT_CONTENT.pt.discord.pendingLabel)).toBeInTheDocument()
  })

  it('redirects to login on 401 or 403, an expired or refused session', async () => {
    signedIn()
    answers(403, { message: 'account_state_not_allowed' })

    await expect(VerificationsPage()).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it('shows the load-error message and logs, instead of crashing, on a real API error', async () => {
    signedIn()
    answers(500, { message: 'boom' })

    renderWithLocale(await VerificationsPage())

    expect(screen.getByRole('alert')).toHaveTextContent(ACCOUNT_CONTENT.pt.loadError)
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('500'))
  })

  it('shows the load-error message on a 200 with a malformed body, without crashing', async () => {
    signedIn()
    apiFetch.mockResolvedValue(new Response('not json', { status: 200 }))

    renderWithLocale(await VerificationsPage())

    expect(screen.getByRole('alert')).toHaveTextContent(ACCOUNT_CONTENT.pt.loadError)
  })

  it('shows the load-error message when the API is unreachable', async () => {
    signedIn()
    apiFetch.mockRejectedValue(new TypeError('fetch failed'))

    renderWithLocale(await VerificationsPage())

    expect(screen.getByRole('alert')).toHaveTextContent(ACCOUNT_CONTENT.pt.loadError)
  })

  it('asks the API not to cache, because the answer carries a session', async () => {
    signedIn()
    answers(200, { emailVerified: false, discordLinked: false })

    await VerificationsPage()

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/accounts/me/queue-prerequisites',
      expect.objectContaining({ cache: 'no-store' }),
    )
  })
})
