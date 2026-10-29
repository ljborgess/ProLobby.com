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
    renderWithLocale(
      <QueuePrerequisitesPanel
        reputation={70}
        reputationBand="good"
        characterVerified
        emailVerified
        discordLinked={false}
        discordPresent
      />,
    )

    expect(screen.getByText(pt.email.doneLabel)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: pt.email.resend })).toBeNull()
    expect(screen.getByRole('link', { name: pt.discord.action })).toBeInTheDocument()
  })

  it('says all three are pending on a fresh account', () => {
    renderWithLocale(
      <QueuePrerequisitesPanel
        reputation={70}
        reputationBand="good"
        emailVerified={false}
        characterVerified={false}
        discordLinked={false}
        discordPresent
      />,
    )

    expect(screen.getByText(pt.email.pendingLabel)).toBeInTheDocument()
    expect(screen.getByText(pt.character.pendingLabel)).toBeInTheDocument()
    expect(screen.getByText(pt.discord.pendingLabel)).toBeInTheDocument()
    expect(screen.getAllByText(pt.pending)).toHaveLength(3)
  })

  it('sends a pending character to the character screen (#196)', () => {
    renderWithLocale(
      <QueuePrerequisitesPanel
        reputation={70}
        reputationBand="good"
        emailVerified
        characterVerified={false}
        discordLinked
        discordPresent
      />,
    )

    expect(screen.getByText(pt.character.pendingHint)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: pt.character.action })).toHaveAttribute(
      'href',
      '/account/character',
    )
    expect(screen.getByText('2/3')).toBeInTheDocument()
  })

  it('carries the state in words, not only in colour (RNF-015)', () => {
    renderWithLocale(
      <QueuePrerequisitesPanel
        reputation={70}
        reputationBand="good"
        characterVerified
        emailVerified
        discordLinked={false}
        discordPresent
      />,
    )

    expect(screen.getAllByText(pt.done)).toHaveLength(2)
    expect(screen.getAllByText(pt.pending)).toHaveLength(1)
  })

  it('congratulates and offers only the way to the queue once all are done', () => {
    renderWithLocale(
      <QueuePrerequisitesPanel
        reputation={70}
        reputationBand="good"
        characterVerified
        emailVerified
        discordLinked
        discordPresent
      />,
    )

    expect(screen.getByText(pt.allDone)).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
    // The queue, and the optional club line (#229), which is not a step.
    expect(screen.getAllByRole('link')).toHaveLength(2)
    expect(screen.getByRole('link', { name: pt.goToQueue })).toHaveAttribute('href', '/queue')
    expect(
      screen.getByRole('link', { name: new RegExp(pt.club.title.replace('?', '\\?')) }),
    ).toHaveAttribute('href', '/account/club')
  })

  it('resends the verification email and then hides the button', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 202 }))
    renderWithLocale(
      <QueuePrerequisitesPanel
        reputation={70}
        reputationBand="good"
        characterVerified
        emailVerified={false}
        discordLinked={false}
        discordPresent
      />,
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
      <QueuePrerequisitesPanel
        reputation={70}
        reputationBand="good"
        characterVerified
        emailVerified={false}
        discordLinked={false}
        discordPresent
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: pt.email.resend }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(pt.email.resendError))
    expect(screen.getByRole('button', { name: pt.email.resend })).toBeEnabled()
  })

  it('shows the absence notice, not the link action, when Discord is linked but the person left the server (RF-060)', () => {
    renderWithLocale(
      <QueuePrerequisitesPanel
        reputation={70}
        reputationBand="good"
        characterVerified
        emailVerified
        discordLinked
        discordPresent={false}
      />,
    )

    expect(screen.getByText(pt.discord.absentLabel)).toBeInTheDocument()
    expect(screen.getByRole('status').textContent).toBe(pt.discord.absentHint)
    expect(screen.queryByRole('link', { name: pt.discord.action })).toBeNull()
    expect(screen.getByRole('link', { name: pt.discord.absentAction })).toHaveAttribute(
      'href',
      expect.stringContaining('discord.gg'),
    )
    // The link itself is untouched (RF-082) — this is a queue block, not the
    // linking step going backwards, so the overall "both done" copy must not
    // show either.
    expect(screen.queryByText(pt.allDone)).toBeNull()
  })

  it('speaks Spanish when the locale is Spanish', () => {
    renderWithLocale(
      <QueuePrerequisitesPanel
        reputation={70}
        reputationBand="good"
        characterVerified
        emailVerified={false}
        discordLinked
        discordPresent
      />,
      'es',
    )

    expect(screen.getByText(ACCOUNT_CONTENT.es.email.pendingLabel)).toBeInTheDocument()
    expect(screen.getByText(ACCOUNT_CONTENT.es.discord.doneLabel)).toBeInTheDocument()
  })
})
