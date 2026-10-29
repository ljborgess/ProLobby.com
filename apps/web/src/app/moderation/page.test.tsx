import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { MODERATION_CONTENT } from '@/content/moderation'

const cookieJar = { get: vi.fn(), toString: () => 'prolobby_session=jwt' }
const apiFetch = vi.fn()
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieJar),
  headers: () => Promise.resolve(new Headers()),
}))
vi.mock('next/navigation', () => ({
  notFound: () => notFound(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/moderation',
}))
vi.mock('@/common/api/client', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }))

import ModerationPage from './page'

const signedIn = () => cookieJar.get.mockReturnValue({ name: 'prolobby_session', value: 'jwt' })
const answer = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status })

/**
 * The moderation area hides that it exists (2026-10-29): anyone who is not a
 * moderator gets the same 404 as a route that was never there.
 */
describe('ModerationPage', () => {
  beforeEach(() => {
    cookieJar.get.mockReset()
    apiFetch.mockReset()
    notFound.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is a 404 without a session, before asking the API anything', async () => {
    cookieJar.get.mockReturnValue(undefined)

    await expect(ModerationPage()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it.each([401, 403])('is a 404 when the API answers %i', async (status) => {
    signedIn()
    apiFetch.mockResolvedValueOnce(answer(status)).mockResolvedValueOnce(answer(200, []))

    await expect(ModerationPage()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('shows the queue to a moderator', async () => {
    signedIn()
    apiFetch.mockResolvedValueOnce(answer(200, [])).mockResolvedValueOnce(answer(200, []))

    renderWithLocale(await ModerationPage())

    expect(screen.getByRole('heading', { name: MODERATION_CONTENT.pt.title })).toBeInTheDocument()
    expect(notFound).not.toHaveBeenCalled()
  })
})
