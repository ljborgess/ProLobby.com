import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { QUEUE_CONTENT } from '@/content/queue'
import type { CharacterView } from '@/modules/character/types'
import type { LobbyView } from './lobby-stages'
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

const inSeconds = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString()

/** The queue state with a lobby at some step (#252). */
function inLobby(lobby: Partial<LobbyView>): QueueState {
  return {
    entry: {
      characterId: 'c1',
      category: 'midfielder',
      joinedAt: new Date().toISOString(),
      cancelledLobby: null,
      lobby: {
        state: 'waiting_players',
        confirmBy: inSeconds(25),
        confirmed: false,
        captainOffer: null,
        isCaptain: false,
        inviteBy: null,
        inviteClubName: null,
        inviteReceived: false,
        clubFullDeclared: false,
        formation: null,
        ...lobby,
      },
    },
    blockedUntil: null,
  }
}

const searchingAgain = (
  cancelled: NonNullable<QueueState['entry']>['cancelledLobby'],
): QueueState => ({
  entry: {
    characterId: 'c1',
    category: 'midfielder',
    joinedAt: new Date().toISOString(),
    cancelledLobby: cancelled,
    lobby: null,
  },
  blockedUntil: null,
})

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

  it('turns the ring with the side arrows: a free locker cannot be joined', async () => {
    renderScreen()

    fireEvent.click(screen.getByRole('button', { name: pt.next }))
    const join = await screen.findByRole('button', { name: pt.join })
    expect(join).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: pt.previous }))
    expect(await screen.findByRole('button', { name: pt.joinAs('MEI') })).toBeEnabled()
  })

  describe('match found (#232)', () => {
    const found = (confirmed = false): QueueState => inLobby({ confirmed })

    it('accepts, then shows the card confirmed', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(answer(204, {}))
        .mockResolvedValueOnce(answer(200, found(true)))
      renderScreen(found())

      const dialog = screen.getByRole('dialog', { name: pt.placedTitle })
      fireEvent.click(within(dialog).getByRole('button', { name: pt.accept }))

      expect(await within(dialog).findByText(pt.confirmed)).toBeInTheDocument()
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        '/bff/queue/confirmation',
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ accept: true }) }),
      )
      expect(within(dialog).queryByRole('button', { name: pt.accept })).toBeNull()
    })

    it('refuses, and the queue state it reloads takes the card away', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(answer(204, {}))
        .mockResolvedValueOnce(
          answer(200, { entry: null, blockedUntil: new Date(Date.now() + 300_000).toISOString() }),
        )
      renderScreen(found())

      fireEvent.click(screen.getByRole('button', { name: pt.refuse }))

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        '/bff/queue/confirmation',
        expect.objectContaining({ body: JSON.stringify({ accept: false }) }),
      )
      expect(await screen.findByText(pt.blockedTitle)).toBeInTheDocument()
    })

    it('says the time ran out when the API closed the answer (409)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(answer(409, { message: 'confirmation_closed' }))
      renderScreen(found())

      fireEvent.click(screen.getByRole('button', { name: pt.accept }))

      expect(await screen.findByText(pt.answerClosed)).toBeInTheDocument()
    })

    it('keeps Tab inside the card', () => {
      renderScreen(found())
      const dialog = screen.getByRole('dialog')
      const accept = within(dialog).getByRole('button', { name: pt.accept })
      const refuse = within(dialog).getByRole('button', { name: pt.refuse })
      const [first, last] = [accept, refuse].sort((a, b) =>
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
      )

      last!.focus()
      fireEvent.keyDown(dialog, { key: 'Tab' })
      expect(document.activeElement).toBe(first)

      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
      expect(document.activeElement).toBe(last)
    })
  })

  describe('lobby steps (#252)', () => {
    const FORMATIONS = ['4-3-3', '4-4-2', '4-2-3-1']

    it('the captain called sees the club and answers: room, none, or the club filled up', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(answer(204, {}))
        .mockResolvedValueOnce(answer(200, inLobby({ state: 'waiting_captain', isCaptain: true })))
      renderScreen(
        inLobby({
          state: 'waiting_captain',
          captainOffer: { answerBy: inSeconds(20), clubName: 'Clube Azul' },
        }),
      )

      const dialog = screen.getByRole('dialog', { name: pt.lobby.captainTitle })
      expect(within(dialog).getByText(pt.lobby.captainBody('Clube Azul'))).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: pt.lobby.captainNo })).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: pt.lobby.captainFull })).toBeInTheDocument()
      fireEvent.click(within(dialog).getByRole('button', { name: pt.lobby.captainYes }))

      expect(await screen.findByText(pt.lobby.captainConfirmed)).toBeInTheDocument()
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        '/bff/queue/captaincy',
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ answer: 'confirm' }) }),
      )
    })

    it('everyone else waits while the captains are chosen', () => {
      renderScreen(inLobby({ state: 'waiting_captain' }))

      expect(screen.getByRole('dialog', { name: pt.lobby.choosingTitle })).toBeInTheDocument()
      expect(screen.getByText(pt.lobby.choosingHint)).toBeInTheDocument()
    })

    it('a player marks the invite received, with no body, and then waits', async () => {
      const step = {
        state: 'waiting_invite',
        inviteBy: inSeconds(240),
        inviteClubName: 'Clube Azul',
      }
      vi.mocked(fetch)
        .mockResolvedValueOnce(answer(204, {}))
        .mockResolvedValueOnce(answer(200, inLobby({ ...step, inviteReceived: true })))
      renderScreen(inLobby(step))

      expect(screen.getByText(pt.lobby.inviteBody('Clube Azul'))).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: pt.lobby.inviteReceived }))

      expect(await screen.findByText(pt.lobby.inviteDone)).toBeInTheDocument()
      expect(fetch).toHaveBeenNthCalledWith(1, '/bff/queue/invite', { method: 'PUT' })
    })

    it('the captain sends the invites and can say the club filled up', async () => {
      const step = {
        state: 'waiting_invite',
        inviteBy: inSeconds(240),
        inviteClubName: 'Clube Azul',
        isCaptain: true,
      }
      vi.mocked(fetch)
        .mockResolvedValueOnce(answer(204, {}))
        .mockResolvedValueOnce(answer(200, inLobby({ ...step, clubFullDeclared: true })))
      renderScreen(inLobby(step))

      expect(screen.getByText(pt.lobby.captainInviteBody('Clube Azul'))).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: pt.lobby.inviteReceived })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: pt.lobby.clubFull }))

      expect(await screen.findByText(pt.lobby.clubFullDone)).toBeInTheDocument()
      expect(fetch).toHaveBeenNthCalledWith(1, '/bff/queue/club-full', { method: 'PUT' })
    })

    it('votes a formation, the vote shows pressed and can change', async () => {
      const formation = {
        options: FORMATIONS,
        voteBy: inSeconds(50),
        myVote: null,
        chosen: null,
        captainChoices: null,
      }
      const step = { state: 'waiting_invite', inviteBy: inSeconds(240), inviteReceived: true }
      vi.mocked(fetch)
        .mockResolvedValueOnce(answer(204, {}))
        .mockResolvedValueOnce(
          answer(200, inLobby({ ...step, formation: { ...formation, myVote: '4-4-2' } })),
        )
      renderScreen(inLobby({ ...step, formation }))

      const vote = screen.getByRole('region', { name: pt.lobby.formationTitle })
      fireEvent.click(within(vote).getByRole('button', { name: '4-4-2' }))

      expect(
        await within(vote).findByRole('button', {
          name: `4-4-2 ${pt.lobby.formationMine}`,
          pressed: true,
        }),
      ).toBeInTheDocument()
      expect(
        within(vote).getByRole('button', { name: '4-3-3', pressed: false }),
      ).toBeInTheDocument()
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        '/bff/queue/formation-vote',
        expect.objectContaining({ body: JSON.stringify({ formation: '4-4-2' }) }),
      )
    })

    it('a tie: the captain picks among the tied ones; the side then shows its formation', async () => {
      const step = { state: 'in_progress', isCaptain: true }
      const tied = {
        options: FORMATIONS,
        voteBy: inSeconds(-5),
        myVote: '4-3-3',
        chosen: null,
        captainChoices: ['4-3-3', '4-4-2'],
      }
      vi.mocked(fetch)
        .mockResolvedValueOnce(answer(204, {}))
        .mockResolvedValueOnce(
          answer(
            200,
            inLobby({ ...step, formation: { ...tied, chosen: '4-4-2', captainChoices: null } }),
          ),
        )
      renderScreen(inLobby({ ...step, formation: tied }))

      expect(screen.getByRole('dialog', { name: pt.lobby.matchTitle })).toBeInTheDocument()
      expect(screen.getByText(pt.lobby.formationCaptainPick)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '4-2-3-1' })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: '4-4-2' }))

      expect(await screen.findByText(pt.lobby.formationChosen('4-4-2'))).toBeInTheDocument()
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        '/bff/queue/formation',
        expect.objectContaining({ body: JSON.stringify({ formation: '4-4-2' }) }),
      )
    })

    it('says the vote opens with the channels, before the bot made them', () => {
      renderScreen(
        inLobby({
          state: 'waiting_invite',
          inviteBy: inSeconds(240),
          formation: {
            options: FORMATIONS,
            voteBy: null,
            myVote: null,
            chosen: null,
            captainChoices: null,
          },
        }),
      )

      expect(screen.getByText(pt.lobby.formationNotOpen)).toBeInTheDocument()
    })
  })

  describe('back to searching, and why (#252)', () => {
    it('someone did not confirm: the lobby vanishes and the search says so', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(answer(204, {}))
        .mockResolvedValueOnce(answer(200, searchingAgain(null)))
      renderScreen(inLobby({}))

      fireEvent.click(screen.getByRole('button', { name: pt.accept }))

      expect(await screen.findByText(pt.notice.undone)).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(screen.getByRole('button', { name: pt.leave })).toBeInTheDocument()
    })

    it('an older cancellation never stands in for a lobby undone later', async () => {
      const old = {
        state: 'cancelled_by_captain',
        endedAt: new Date(Date.now() - 60_000).toISOString(),
      } as const
      const again = searchingAgain(old)
      // In a lobby the API sends no cancellation; the old one comes back with the search.
      const next = inLobby({})
      vi.mocked(fetch)
        .mockResolvedValueOnce(answer(204, {}))
        .mockResolvedValueOnce(answer(200, again))
      // Back from that cancellation, now in a new lobby's 30 s, notice never dismissed.
      renderScreen(next)

      fireEvent.click(screen.getByRole('button', { name: pt.accept }))

      expect(await screen.findByText(pt.notice.undone)).toBeInTheDocument()
      expect(screen.queryByText(pt.notice.byCaptain)).toBeNull()
    })

    it('a lobby cancelled between two polls still says why, not "did not confirm"', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(answer(204, {}))
        .mockResolvedValueOnce(
          answer(
            200,
            searchingAgain({ state: 'cancelled_no_fault', endedAt: new Date().toISOString() }),
          ),
        )
      renderScreen(inLobby({}))

      fireEvent.click(screen.getByRole('button', { name: pt.accept }))

      expect(await screen.findByText(pt.notice.noFault)).toBeInTheDocument()
      expect(screen.queryByText(pt.notice.undone)).toBeNull()
    })

    it.each([
      ['cancelled_by_captain', pt.notice.byCaptain],
      ['cancelled_no_fault', pt.notice.noFault],
    ] as const)('a %s lobby says why, until dismissed', (state, text) => {
      renderScreen(searchingAgain({ state, endedAt: new Date().toISOString() }))

      expect(screen.getByText(text)).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: pt.notice.dismiss }))
      expect(screen.queryByText(text)).toBeNull()
    })
  })

  it('speaks Spanish in the lobby too', () => {
    renderScreen(
      inLobby({
        state: 'waiting_captain',
        captainOffer: { answerBy: inSeconds(20), clubName: 'Club Rojo' },
      }),
      'es',
    )

    expect(
      screen.getByRole('dialog', { name: QUEUE_CONTENT.es.lobby.captainTitle }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: QUEUE_CONTENT.es.lobby.captainYes }),
    ).toBeInTheDocument()
  })

  it('speaks Spanish', () => {
    renderScreen(undefined, 'es')

    expect(screen.getByRole('heading', { name: QUEUE_CONTENT.es.title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: QUEUE_CONTENT.es.joinAs('MED') })).toBeInTheDocument()
  })
})
