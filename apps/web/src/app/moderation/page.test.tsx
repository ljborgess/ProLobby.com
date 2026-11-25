import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { MODERATION_PANEL_CONTENT } from '@/content/moderation-panel'

const cookieJar = { get: vi.fn(), toString: () => 'prolobby_session=jwt' }
const apiFetch = vi.fn()
const fetchMock = vi.fn()
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
const redirect = vi.fn((to: string) => {
  throw new Error(`NEXT_REDIRECT ${to}`)
})

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieJar),
  headers: () => Promise.resolve(new Headers()),
}))
vi.mock('next/navigation', () => ({
  notFound: () => notFound(),
  redirect: (to: string) => redirect(to),
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
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    notFound.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
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

  it('sends a moderator without the second factor to set it up or type the code (#311)', async () => {
    signedIn()
    apiFetch
      .mockResolvedValueOnce(answer(403, { message: 'two_factor_required' }))
      .mockResolvedValueOnce(answer(200, []))

    await expect(ModerationPage()).rejects.toThrow('NEXT_REDIRECT /moderation/2fa')
  })

  it('shows the real prints queue to a moderator, also outside production', async () => {
    signedIn()
    apiFetch
      .mockResolvedValueOnce(
        answer(200, [{ caseId: 'c1', category: 'midfielder', platform: 'ps5' }]),
      )
      .mockResolvedValueOnce(answer(200, [{ archetype: 'MAESTRO' }]))

    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.startsWith('/bff/moderation/cases/summary')
          ? answer(200, {
              sections: [
                {
                  key: 'verifications',
                  open: 1,
                  types: [{ type: 'character_verification', open: 1 }],
                },
              ],
            })
          : answer(200, []),
      ),
    )

    renderWithLocale(await ModerationPage())

    // The Personagem filter opens the real prints queue.
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
    it('reads the queue from the API, never from made-up cases', async () => {
      signedIn()
      apiFetch.mockResolvedValueOnce(answer(200, [])).mockResolvedValueOnce(answer(200, []))
      fetchMock.mockImplementation((url: string) =>
        Promise.resolve(
          url.startsWith('/bff/moderation/cases/summary')
            ? answer(200, {
                sections: [{ key: 'reports', open: 1, types: [{ type: 'user_report', open: 1 }] }],
              })
            : answer(200, []),
        ),
      )

      renderWithLocale(await ModerationPage())

      expect(await screen.findByRole('button', { name: /Denúncias/ })).toBeInTheDocument()
      expect(fetchMock).toHaveBeenCalledWith(
        '/bff/moderation/cases/summary',
        expect.objectContaining({ cache: 'no-store' }),
      )
    })
  })
})
