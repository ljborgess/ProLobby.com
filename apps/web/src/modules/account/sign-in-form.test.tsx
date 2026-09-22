import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { AUTH_CONTENT } from '@/content/auth'
import { SignInForm } from './sign-in-form'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const submit = () => {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.com' } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'any-password' } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('SignInForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    push.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /**
   * Routing change of 2026-09-22: the home stopped being the signed-in area,
   * so a successful login has to land on /verifications, not on /.
   */
  it('goes to /verifications on a successful login, not to the home', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }))
    renderWithLocale(<SignInForm />)

    submit()

    await waitFor(() => expect(push).toHaveBeenCalledWith('/verifications'))
  })

  it('says the service is unreachable, not that the password is wrong, when the API is down', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 502 }))
    renderWithLocale(<SignInForm />)

    submit()

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(AUTH_CONTENT.pt.signIn.networkError),
    )
  })

  it('still says "wrong credentials" for a real 401', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 401 }))
    renderWithLocale(<SignInForm />)

    submit()

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(AUTH_CONTENT.pt.signIn.invalidCredentials),
    )
  })
})
