import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { MODERATION_CONTENT } from '@/content/moderation'
import { MODERATION_PANEL_CONTENT } from '@/content/moderation-panel'

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
    vi.unstubAllEnvs()
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

  it('shows the real prints queue to a moderator, also outside production', async () => {
    signedIn()
    apiFetch
      .mockResolvedValueOnce(
        answer(200, [{ caseId: 'c1', category: 'midfielder', platform: 'ps5' }]),
      )
      .mockResolvedValueOnce(answer(200, [{ archetype: 'MAESTRO' }]))

    renderWithLocale(await ModerationPage())

    // The sample panel counts the real prints: the Personagem filter opens the real queue.
    fireEvent.click(await screen.findByRole('button', { name: /Verificações/ }))
    fireEvent.click(
      await screen.findByRole('button', {
        name: new RegExp(MODERATION_PANEL_CONTENT.pt.caseTypes.character_verification),
      }),
    )
    expect(await screen.findByRole('button', { name: /aprovar/i })).toBeInTheDocument()
    expect(notFound).not.toHaveBeenCalled()
  })

  describe('the case queue by section (#309)', () => {
    it('shows made-up cases, and says so, outside production while the API has no queue', async () => {
      signedIn()
      vi.stubEnv('NODE_ENV', 'development')
      apiFetch.mockResolvedValueOnce(answer(200, [])).mockResolvedValueOnce(answer(200, []))

      renderWithLocale(await ModerationPage())

      expect(screen.getByText(MODERATION_PANEL_CONTENT.pt.sample)).toBeInTheDocument()
    })

    it('never shows made-up cases in production: the prints screen alone', async () => {
      signedIn()
      vi.stubEnv('NODE_ENV', 'production')
      apiFetch.mockResolvedValueOnce(answer(200, [])).mockResolvedValueOnce(answer(200, []))

      renderWithLocale(await ModerationPage())

      expect(screen.getByRole('heading', { name: MODERATION_CONTENT.pt.title })).toBeInTheDocument()
      expect(screen.queryByText(MODERATION_PANEL_CONTENT.pt.sample)).not.toBeInTheDocument()
    })
  })
})
