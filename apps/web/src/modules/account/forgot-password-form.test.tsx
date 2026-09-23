import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { AUTH_CONTENT } from '@/content/auth'
import { ForgotPasswordForm } from './forgot-password-form'

const pt = AUTH_CONTENT.pt.forgotPassword

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the same message for a known address', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 202 }))
    renderWithLocale(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText(pt.emailLabel), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: pt.submit }))

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(pt.sent))
  })

  /**
   * RF-070: the response must not be the oracle that tells a stranger's
   * address apart from an account holder's, and a network failure reading
   * differently from "202, unknown address" would still be that oracle.
   */
  it('shows the same message even when the request fails outright', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('offline'))
    renderWithLocale(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText(pt.emailLabel), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: pt.submit }))

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(pt.sent))
  })

  it('posts to the password-resets proxy with the typed address', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 202 }))
    renderWithLocale(<ForgotPasswordForm />)

    fireEvent.change(screen.getByLabelText(pt.emailLabel), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: pt.submit }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/bff/accounts/password-resets',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'a@b.com' }) }),
      ),
    )
  })
})
