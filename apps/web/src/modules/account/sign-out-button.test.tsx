import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }))

import { SignOutButton } from './sign-out-button'

/**
 * Signing out is the only way to drop an `HttpOnly` session cookie from the
 * browser (ADR-006) — a script cannot clear it, so this button has to reach
 * the API that can. Added 2026-09-22, when the gap surfaced: a signed-in
 * person had no way out short of clearing site data by hand.
 */
describe('SignOutButton', () => {
  beforeEach(() => {
    push.mockClear()
    refresh.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('asks the API to expire the session, then leaves the signed-in area', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    renderWithLocale(<SignOutButton />)

    fireEvent.click(screen.getByRole('button', { name: 'Sair da conta' }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
    expect(fetchMock).toHaveBeenCalledWith('/bff/sessions', { method: 'DELETE' })
    // Without the refresh the App Router can replay the signed-in render from
    // its client cache, so the person looks logged in until a hard reload.
    expect(refresh).toHaveBeenCalled()
  })

  /**
   * Security review of 2026-09-22 caught the original behaviour here: it left
   * for `/` whatever happened. Only the API can end the session — the cookie
   * is `HttpOnly` — so leaving on a failure told someone they had signed out
   * while they were still signed in. On a shared machine that is the worst
   * possible lie, so the button now stays put and says so.
   */
  it('stays and warns when the connection drops, instead of pretending it signed out', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    renderWithLocale(<SignOutButton />)

    fireEvent.click(screen.getByRole('button', { name: 'Sair da conta' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(push).not.toHaveBeenCalled()
  })

  it('stays and warns on 502 too — fetch resolves on 5xx, so the status must be read', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ message: 'api_unavailable' }, { status: 502 })),
    )
    renderWithLocale(<SignOutButton />)

    fireEvent.click(screen.getByRole('button', { name: 'Sair da conta' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(push).not.toHaveBeenCalled()
  })
})
