import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { ACCOUNT_CONTENT } from '@/content/account'
import { CLUB_CONTENT } from '@/content/club'

const cookieJar = { toString: () => 'prolobby_session=jwt' }
const apiFetch = vi.fn()
const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`)
})

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieJar),
  headers: () => Promise.resolve(new Headers()),
}))
vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirect(path),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/common/api/client', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }))

import ClubPage from './page'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

/** #229: the same never-crash paths as /account/discord. */
describe('ClubPage', () => {
  beforeEach(() => {
    apiFetch.mockReset()
    redirect.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the declared club', async () => {
    apiFetch.mockResolvedValue(json({ club: { clubName: 'Clube Azul', freeSlots: 3 } }))

    renderWithLocale(await ClubPage())

    expect(screen.getByLabelText(CLUB_CONTENT.pt.clubNameLabel, { exact: false })).toHaveValue(
      'Clube Azul',
    )
  })

  it('shows an empty form when there is no club', async () => {
    apiFetch.mockResolvedValue(json({ club: null }))

    renderWithLocale(await ClubPage())

    expect(screen.getByLabelText(CLUB_CONTENT.pt.clubNameLabel, { exact: false })).toHaveValue('')
    expect(screen.queryByRole('button', { name: CLUB_CONTENT.pt.remove })).toBeNull()
  })

  it.each([401, 403])('sends a %s to the login', async (status) => {
    apiFetch.mockResolvedValue(json({}, status))

    await expect(ClubPage()).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it.each([
    ['the API unreachable', () => apiFetch.mockRejectedValue(new Error('down'))],
    ['a 500', () => apiFetch.mockResolvedValue(json({}, 500))],
    ['a malformed body', () => apiFetch.mockResolvedValue(new Response('not json'))],
  ])('shows the load error on %s, never a crash', async (_name, arrange) => {
    arrange()

    renderWithLocale(await ClubPage())

    expect(screen.getByRole('alert')).toHaveTextContent(ACCOUNT_CONTENT.pt.loadError)
  })
})
