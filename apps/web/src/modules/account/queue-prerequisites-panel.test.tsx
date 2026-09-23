import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { ACCOUNT_CONTENT } from '@/content/account'
import { QueuePrerequisitesPanel } from './queue-prerequisites-panel'

const pt = ACCOUNT_CONTENT.pt

describe('QueuePrerequisitesPanel', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('offers the action only on what is pending', () => {
    renderWithLocale(<QueuePrerequisitesPanel emailVerified discordLinked={false} discordPresent />)

    expect(screen.getByText(pt.email.doneLabel)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: pt.email.resend })).toBeNull()
    expect(screen.getByRole('link', { name: pt.discord.action })).toBeInTheDocument()
  })

  it('says both are pending on a fresh account', () => {
    renderWithLocale(
      <QueuePrerequisitesPanel emailVerified={false} discordLinked={false} discordPresent />,
    )

    expect(screen.getByText(pt.email.pendingLabel)).toBeInTheDocument()
    expect(screen.getByText(pt.discord.pendingLabel)).toBeInTheDocument()
    expect(screen.getAllByText(pt.pending)).toHaveLength(2)
  })

  it('carries the state in words, not only in colour (RNF-015)', () => {
    renderWithLocale(<QueuePrerequisitesPanel emailVerified discordLinked={false} discordPresent />)

    expect(screen.getByText(pt.done)).toBeInTheDocument()
    expect(screen.getByText(pt.pending)).toBeInTheDocument()
  })

  it('congratulates and offers nothing once both are done', () => {
    renderWithLocale(<QueuePrerequisitesPanel emailVerified discordLinked discordPresent />)

    expect(screen.getByText(pt.allDone)).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('resends the verification email and then hides the button', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 202 }))
    renderWithLocale(
      <QueuePrerequisitesPanel emailVerified={false} discordLinked={false} discordPresent />,
    )

    fireEvent.click(screen.getByRole('button', { name: pt.email.resend }))

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(pt.email.resent))
    expect(fetch).toHaveBeenCalledWith('/bff/accounts/me/verifications/resends', { method: 'POST' })
    expect(screen.queryByRole('button', { name: pt.email.resend })).toBeNull()
  })

  it.each([
    ['the proxy refuses', async () => new Response(null, { status: 502 })],
    ['the connection drops', async () => Promise.reject(new TypeError('offline'))],
  ])('keeps the button and explains when %s', async (_name, respond) => {
    vi.mocked(fetch).mockImplementation(respond as never)
    renderWithLocale(
      <QueuePrerequisitesPanel emailVerified={false} discordLinked={false} discordPresent />,
    )

    fireEvent.click(screen.getByRole('button', { name: pt.email.resend }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(pt.email.resendError))
    expect(screen.getByRole('button', { name: pt.email.resend })).toBeEnabled()
  })

  it('shows the absence notice, not the link action, when Discord is linked but the person left the server (RF-060)', () => {
    renderWithLocale(<QueuePrerequisitesPanel emailVerified discordLinked discordPresent={false} />)

    expect(screen.getByText(pt.discord.absentLabel)).toBeInTheDocument()
    expect(screen.getByRole('status').textContent).toBe(pt.discord.absentHint)
    expect(screen.queryByRole('link', { name: pt.discord.action })).toBeNull()
    // The link itself is untouched (RF-082) — this is a queue block, not the
    // linking step going backwards, so the overall "both done" copy must not
    // show either.
    expect(screen.queryByText(pt.allDone)).toBeNull()
  })

  it('speaks Spanish when the locale is Spanish', () => {
    renderWithLocale(
      <QueuePrerequisitesPanel emailVerified={false} discordLinked discordPresent />,
      'es',
    )

    expect(screen.getByText(ACCOUNT_CONTENT.es.email.pendingLabel)).toBeInTheDocument()
    expect(screen.getByText(ACCOUNT_CONTENT.es.discord.doneLabel)).toBeInTheDocument()
  })
})
