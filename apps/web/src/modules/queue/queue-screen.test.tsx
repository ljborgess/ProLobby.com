import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { QUEUE_CONTENT } from '@/content/queue'
import type { CharacterView } from '@/modules/character/types'
import { QueueScreen, type QueueState } from './queue-screen'

const pt = QUEUE_CONTENT.pt

const MAESTRO: CharacterView = {
  id: 'c1',
  category: 'midfielder',
  archetype: 'MAESTRO',
  platform: 'ps5',
  state: 'verified',
  elo: 1000,
}

const MOVEMENT = {
  goalkeeper: 'low',
  defender: 'busy',
  midfielder: 'full',
  winger: 'low',
  striker: 'busy',
} as const

function renderScreen(initial: QueueState = { entry: null, blockedUntil: null }, locale?: 'es') {
  return renderWithLocale(
    <QueueScreen
      initial={initial}
      characters={[MAESTRO]}
      movement={MOVEMENT}
      reputation={50}
      reputationBand="slow_queue"
    />,
    locale,
  )
}

const answer = (status: number, body: unknown) =>
  ({ ok: status < 300, status, json: async () => body }) as Response

describe('QueueScreen (#233)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows each category as a band, never a count (RF-008)', () => {
    renderScreen()

    expect(screen.getByRole('heading', { name: pt.movementHeading })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    // The shirt numbers on the kits are not counts; the bands are what RF-008 guards.
    const chips = [pt.bands.low, pt.bands.busy, pt.bands.full].flatMap((band) =>
      screen.getAllByText(band),
    )
    expect(screen.getAllByText(pt.bands.low)).toHaveLength(2)
    expect(screen.getAllByText(pt.bands.full)).toHaveLength(1)
    for (const chip of chips) expect(chip.textContent).not.toMatch(/[0-9]/)
  })

  it('shows the reputation dial, with the band under 55 explained', () => {
    renderScreen()

    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByText(/Abaixo de 55/)).toBeInTheDocument()
  })

  it('lists every missing prerequisite at once, in order, each with its link (RF-002)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      answer(403, {
        message: 'queue_prerequisites_missing',
        missing: ['email', 'character', 'discord'],
      }),
    )
    renderScreen()

    fireEvent.click(screen.getByRole('button', { name: pt.joinAs('MEI') }))

    const alert = await screen.findByRole('alert')
    const links = within(alert).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      pt.missing.email,
      pt.missing.character,
      pt.missing.discord,
    ])
    expect(links[1]).toHaveAttribute('href', '/account/character')
  })

  it('joins, shows the search, and leaves', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        answer(201, {
          characterId: 'c1',
          category: 'midfielder',
          joinedAt: new Date().toISOString(),
          lobby: null,
        }),
      )
      .mockResolvedValueOnce(answer(204, {}))
    renderScreen()

    fireEvent.click(screen.getByRole('button', { name: pt.joinAs('MEI') }))
    expect(await screen.findByText(pt.searching)).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/bff/queue', expect.objectContaining({ method: 'POST' }))

    fireEvent.click(screen.getByRole('button', { name: pt.leave }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: pt.joinAs('MEI') })).toBeInTheDocument(),
    )
  })

  it('says how long a block lasts', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      answer(403, { message: 'queue_blocked', retryAfterSeconds: 290 }),
    )
    renderScreen()

    fireEvent.click(screen.getByRole('button', { name: pt.joinAs('MEI') }))

    expect(await screen.findByText(pt.blocked(5))).toBeInTheDocument()
  })

  it('speaks Spanish', () => {
    renderScreen(undefined, 'es')

    expect(screen.getByRole('heading', { name: QUEUE_CONTENT.es.title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: QUEUE_CONTENT.es.joinAs('MED') })).toBeInTheDocument()
  })
})
