import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { AUTH_CONTENT } from '@/content/auth'
import { ResetPasswordForm } from './reset-password-form'

const pt = AUTH_CONTENT.pt.resetPassword

let token: string | null = 'a-valid-looking-token'
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => token }),
}))

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    token = 'a-valid-looking-token'
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows success and a way to sign in once the reset lands', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
    renderWithLocale(<ResetPasswordForm />)

    fireEvent.change(screen.getByLabelText(pt.passwordLabel), {
      target: { value: 'a-long-enough-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: pt.submit }))

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(pt.success))
    expect(screen.getByRole('link', { name: pt.goToSignIn })).toBeInTheDocument()
  })

  it('says the link is invalid on a 400, not a generic error', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 400 }))
    renderWithLocale(<ResetPasswordForm />)

    fireEvent.change(screen.getByLabelText(pt.passwordLabel), {
      target: { value: 'a-long-enough-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: pt.submit }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(pt.invalidToken))
  })

  it('sends the token from the URL alongside the new password', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))
    renderWithLocale(<ResetPasswordForm />)

    fireEvent.change(screen.getByLabelText(pt.passwordLabel), {
      target: { value: 'a-long-enough-password' },
    })
    fireEvent.click(screen.getByRole('button', { name: pt.submit }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/bff/accounts/password-resets/confirmations',
        expect.objectContaining({
          body: JSON.stringify({
            token: 'a-valid-looking-token',
            password: 'a-long-enough-password',
          }),
        }),
      ),
    )
  })

  it('shows invalidToken immediately with no request when the URL carries no token', () => {
    token = null
    renderWithLocale(<ResetPasswordForm />)

    expect(screen.getByRole('alert').textContent).toBe(pt.invalidToken)
    expect(fetch).not.toHaveBeenCalled()
  })
})
