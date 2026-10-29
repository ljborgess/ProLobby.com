import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { AUTH_CONTENT } from '@/content/auth'
import { VerifyEmailStatus } from './verify-email-status'

const pt = AUTH_CONTENT.pt.verifyEmail

let token: string | null = 'a-valid-looking-token'
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => token }),
}))

describe('VerifyEmailStatus', () => {
  beforeEach(() => {
    token = 'a-valid-looking-token'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the token from the URL on mount, with no click needed', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
    renderWithLocale(<VerifyEmailStatus />)

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/bff/accounts/verifications',
        expect.objectContaining({ body: JSON.stringify({ token: 'a-valid-looking-token' }) }),
      ),
    )
  })

  it('shows success on 204', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
    renderWithLocale(<VerifyEmailStatus />)

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(pt.success))
  })

  it('says the link is invalid on a 400, not a generic error', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 400 }))
    renderWithLocale(<VerifyEmailStatus />)

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(pt.invalidToken))
    // The resend lives on the account home.
    expect(screen.getByRole('link', { name: pt.requestNew })).toHaveAttribute(
      'href',
      '/verifications',
    )
  })

  it('shows a generic error when the request itself fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('offline'))
    renderWithLocale(<VerifyEmailStatus />)

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(pt.genericError))
  })

  it('shows invalidToken immediately with no request when the URL carries no token', () => {
    token = null
    renderWithLocale(<VerifyEmailStatus />)

    expect(screen.getByRole('alert').textContent).toBe(pt.invalidToken)
    expect(fetch).not.toHaveBeenCalled()
  })
})
