import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { DISCORD_CONTENT } from '@/content/discord'
import { DiscordLinkPanel } from './discord-link-panel'
import { DISCORD_LINK_STATUSES, statusFromApi } from './discord-link-status'

describe('statusFromApi', () => {
  it.each([
    [204, undefined, 'linked'],
    [400, 'invalid_state', 'invalid_state'],
    [403, 'discord_link_blocked', 'blocked'],
    [409, 'discord_already_linked', 'already_linked'],
    [409, 'account_already_linked', 'account_already_linked'],
    [503, 'discord_link_unavailable', 'unavailable'],
    [500, undefined, 'error'],
    [400, 'something_else', 'error'],
  ] as const)('%s %s becomes %s', (httpStatus, message, expected) => {
    expect(statusFromApi(httpStatus, message)).toBe(expected)
  })
})

describe('the dictionary', () => {
  it('has a message for every status, in both languages', () => {
    for (const locale of ['pt', 'es'] as const) {
      for (const status of DISCORD_LINK_STATUSES) {
        expect(DISCORD_CONTENT[locale].statuses[status]).toBeTruthy()
      }
    }
  })

  it('never says which identity a ban tripped on', () => {
    for (const locale of ['pt', 'es'] as const) {
      expect(DISCORD_CONTENT[locale].statuses.blocked.toLowerCase()).not.toMatch(
        /gamertag|xbox|psn/,
      )
    }
  })
})

describe('DiscordLinkPanel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('offers the link when there is none, in Portuguese', () => {
    renderWithLocale(<DiscordLinkPanel linked={false} />)

    expect(screen.getByText('Discord não vinculado')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Vincular Discord' })).toBeTruthy()
  })

  it('shows the linked state with no button and no way to unlink (RF-082)', () => {
    renderWithLocale(<DiscordLinkPanel linked />)

    expect(screen.getByText('Discord vinculado')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('speaks Spanish when the locale is Spanish', () => {
    renderWithLocale(<DiscordLinkPanel linked={false} />, 'es')

    expect(screen.getByText('Discord no vinculado')).toBeTruthy()
  })

  it('announces the outcome of the last attempt as an alert when it failed', () => {
    renderWithLocale(<DiscordLinkPanel linked={false} status="blocked" />)

    expect(screen.getByRole('alert').textContent).toBe(DISCORD_CONTENT.pt.statuses.blocked)
  })

  it('announces success as a status, not an alert', () => {
    renderWithLocale(<DiscordLinkPanel linked status="linked" />)

    expect(screen.getByRole('status').textContent).toBe(DISCORD_CONTENT.pt.statuses.linked)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('asks the API where to go and sends the person there', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ authorizationUrl: 'https://discord.com/oauth2/authorize?x=1' }),
        {
          status: 201,
        },
      ),
    )
    renderWithLocale(<DiscordLinkPanel linked={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Vincular Discord' }))

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith('https://discord.com/oauth2/authorize?x=1'),
    )
    expect(fetch).toHaveBeenCalledWith('/bff/discord-links', { method: 'POST' })
  })

  it.each([
    ['another host', JSON.stringify({ authorizationUrl: 'https://evil.example/authorize' })],
    ['plain http', JSON.stringify({ authorizationUrl: 'http://discord.com/oauth2/authorize' })],
    [
      'a lookalike host',
      JSON.stringify({ authorizationUrl: 'https://discord.com.evil.example/x' }),
    ],
    ['a body that is not JSON', '<html>'],
  ])('never follows %s, it shows an error', async (_name, body) => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    vi.mocked(fetch).mockResolvedValue(new Response(body, { status: 201 }))
    renderWithLocale(<DiscordLinkPanel linked={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Vincular Discord' }))

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(DISCORD_CONTENT.pt.statuses.error),
    )
    expect(assign).not.toHaveBeenCalled()
  })

  it('gets the button back when the connection drops, instead of hanging', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('offline'))
    renderWithLocale(<DiscordLinkPanel linked={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Vincular Discord' }))

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(DISCORD_CONTENT.pt.statuses.networkError),
    )
    expect(
      (screen.getByRole('button', { name: 'Vincular Discord' }) as HTMLButtonElement).disabled,
    ).toBe(false)
  })

  it('says the link is unavailable when the API answers 503', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 503 }))
    renderWithLocale(<DiscordLinkPanel linked={false} />)

    fireEvent.click(screen.getByRole('button', { name: 'Vincular Discord' }))

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(DISCORD_CONTENT.pt.statuses.unavailable),
    )
  })
})
