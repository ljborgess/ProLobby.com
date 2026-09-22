import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
// The panel this page renders reads DISCORD_CONTENT, not ACCOUNT_CONTENT. The
// assertion below used to name the account dictionary and passed only because
// both happened to carry the same sentence; the copy trim of 2026-09-22 pulled
// them apart and exposed it.
import { DISCORD_CONTENT } from '@/content/discord'

const cookieJar = { toString: () => 'prolobby_session=jwt' }
const apiFetch = vi.fn()
const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`)
})

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve(cookieJar),
  headers: () => Promise.resolve(new Headers()),
}))
vi.mock('next/navigation', () => ({ redirect: (path: string) => redirect(path) }))
vi.mock('@/common/api/client', () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args) }))

import DiscordPage from './page'

const params = (status?: string) => ({ searchParams: Promise.resolve({ status }) }) as never

/**
 * Code-review findings of 2026-09-22: the unguarded `.json()` on a 200 with a
 * malformed body, and a real 5xx silently rendering the same as intentional
 * downtime with nothing logged.
 */
describe('DiscordPage', () => {
  beforeEach(() => {
    apiFetch.mockReset()
    redirect.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the panel when the API answers cleanly', async () => {
    apiFetch.mockResolvedValue(new Response(JSON.stringify({ linked: true }), { status: 200 }))

    renderWithLocale(await DiscordPage(params()))

    expect(screen.getByText(DISCORD_CONTENT.pt.linkedLabel)).toBeInTheDocument()
  })

  it('shows "unavailable" instead of crashing on a 200 with a malformed body', async () => {
    apiFetch.mockResolvedValue(new Response('not json', { status: 200 }))

    await expect(DiscordPage(params())).resolves.toBeTruthy()
    renderWithLocale(await DiscordPage(params()))

    expect(console.error).toHaveBeenCalled()
  })

  it('logs a real 5xx instead of treating it the same as a silent downtime', async () => {
    apiFetch.mockResolvedValue(new Response(JSON.stringify({ message: 'boom' }), { status: 500 }))

    renderWithLocale(await DiscordPage(params()))

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('500'))
  })

  it('does not log for the ordinary 503 (Discord not configured)', async () => {
    apiFetch.mockResolvedValue(
      new Response(JSON.stringify({ message: 'unavailable' }), { status: 503 }),
    )

    renderWithLocale(await DiscordPage(params()))

    expect(console.error).not.toHaveBeenCalled()
  })

  it('redirects to login on 401, without rendering the panel', async () => {
    apiFetch.mockResolvedValue(new Response(null, { status: 401 }))

    await expect(DiscordPage(params())).rejects.toThrow('NEXT_REDIRECT:/login')
  })
})
