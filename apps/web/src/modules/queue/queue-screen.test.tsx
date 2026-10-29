import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { QUEUE_CONTENT } from '@/content/queue'
import type { CharacterView } from '@/modules/character/types'
import type { LobbyView } from './lobby-stages'
import { QueueScreen, type QueueState, stallTurn } from './queue-screen'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => '/queue',
}))

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
      stall: null,
      lobby: {
        state: 'waiting_players',
        confirmBy: inSeconds(25),
        confirmed: false,
        refusalBlockMinutes: null,
        captainOffer: null,
        isCaptain: false,
        inviteBy: null,
        inviteClubName: null,
        inviteReceived: false,
        clubFullDeclared: false,
        formation: null,
        side: 'a',
        reportableFrom: null,
        myReport: null,
        reportConfirmBy: null,
        players: null,
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
    stall: null,
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
    sessionStorage.clear()
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

    it('says the block before refusing, and going back sends nothing (#234)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(answer(204, {}))
      renderScreen(inLobby({ refusalBlockMinutes: 15 }))

      fireEvent.click(screen.getByRole('button', { name: pt.refuse }))
      expect(screen.getByRole('alert')).toHaveTextContent(pt.refuseWarning(15))
      expect(fetch).not.toHaveBeenCalled()

      fireEvent.click(screen.getByRole('button', { name: pt.refuseBack }))
      expect(screen.getByRole('button', { name: pt.accept })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: pt.refuse }))
      fireEvent.click(screen.getByRole('button', { name: pt.refuseConfirm }))
      await waitFor(() =>
        expect(fetch).toHaveBeenCalledWith(
          '/bff/queue/confirmation',
          expect.objectContaining({ body: JSON.stringify({ accept: false }) }),
        ),
      )
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

  describe('outside the tab and behind the login (audit 2026-10-28)', () => {
    it('counts the 30 s down in the tab title while the answer is due, and gives it back', () => {
      document.title = 'Fila — ProLobby'
      const { unmount } = renderScreen(inLobby({ confirmBy: inSeconds(25) }))

      expect(document.title).toMatch(/^\(2[45]s\) Aceitar partida · ProLobby$/)

      unmount()
      expect(document.title).toBe('Fila — ProLobby')
    })

    it('a poll answered 401 goes to the login instead of searching forever', async () => {
      vi.mocked(fetch).mockResolvedValue(answer(401, {}))
      renderScreen(inLobby({ confirmed: true }))

      fireEvent(document, new Event('visibilitychange'))

      await waitFor(() => expect(push).toHaveBeenCalledWith('/login'))
    })

    it('the menu marks the queue as the current page', () => {
      renderScreen()

      expect(screen.getByRole('link', { name: 'Fila' })).toHaveAttribute('aria-current', 'page')
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

    it('a confirmed captain gives the role up before the other side confirms (RF-032)', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(answer(204, {}))
        .mockResolvedValueOnce(answer(200, inLobby({ state: 'waiting_captain' })))
      renderScreen(inLobby({ state: 'waiting_captain', isCaptain: true }))

      expect(screen.getByText(pt.lobby.captainConfirmed)).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: pt.lobby.captainWithdraw }))

      expect(await screen.findByText(pt.lobby.choosingHint)).toBeInTheDocument()
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        '/bff/queue/captaincy',
        expect.objectContaining({ method: 'DELETE' }),
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
        counted: false,
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
        counted: true,
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
            counted: false,
            chosen: null,
            captainChoices: null,
          },
        }),
      )

      expect(screen.getByText(pt.lobby.formationNotOpen)).toBeInTheDocument()
    })

    it.each([
      [false, pt.lobby.formationCounting],
      [true, pt.lobby.formationWaitCaptain],
    ])('past the 60 s, counted=%s: counting, then waiting on the captain', (counted, text) => {
      renderScreen(
        inLobby({
          state: 'in_progress',
          formation: {
            options: FORMATIONS,
            voteBy: inSeconds(-5),
            myVote: '4-3-3',
            counted,
            chosen: null,
            captainChoices: null,
          },
        }),
      )

      expect(screen.getByText(text)).toBeInTheDocument()
    })

    it('an answer that went through is not an error when the reload after it fails', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(answer(204, {}))
        .mockRejectedValueOnce(new Error('offline'))
      renderScreen(inLobby({}))

      fireEvent.click(screen.getByRole('button', { name: pt.accept }))

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
      expect(screen.queryByText(pt.error)).toBeNull()
    })
  })

  describe('the result (4.1, 4.2)', () => {
    const player = (participationId: string, gamertag: string | null) => ({
      participationId,
      gamertag,
      category: 'defender' as const,
      myRating: null,
    })
    const ago = (seconds: number) => inSeconds(-seconds)

    it('counts down until the print is accepted', () => {
      renderScreen(inLobby({ state: 'in_progress', reportableFrom: inSeconds(125) }))
      expect(screen.getByText(/O report do placar abre em 2:0\d\./)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: pt.result.send })).toBeNull()
    })

    it('sends score, print and absence with the side the API knows; then shows it sent', async () => {
      const step = {
        state: 'in_progress',
        side: 'b' as const,
        reportableFrom: ago(60),
        players: { teammates: [player('p-mate', 'Lateral10')], opponents: [player('p-opp', null)] },
      }
      vi.mocked(fetch)
        .mockResolvedValueOnce(answer(201, {}))
        .mockResolvedValueOnce(
          answer(
            200,
            inLobby({
              ...step,
              state: 'awaiting_confirmation',
              reportConfirmBy: inSeconds(600),
              myReport: { id: 'r1', side: 'b', scoreA: 1, scoreB: 3, absent: ['p-opp'] },
            }),
          ),
        )
      renderScreen(inLobby(step))

      fireEvent.change(screen.getByLabelText(pt.result.mine), { target: { value: '3' } })
      fireEvent.change(screen.getByLabelText(pt.result.theirs), { target: { value: '1' } })
      fireEvent.change(screen.getByLabelText(pt.result.printLabel, { exact: false }), {
        target: { files: [new File(['png'], 'placar.png', { type: 'image/png' })] },
      })
      // No gamertag: the place stands in for the name.
      fireEvent.click(screen.getByRole('checkbox', { name: /ZAG/ }))
      fireEvent.click(screen.getByRole('button', { name: pt.result.send }))

      expect(await screen.findByText(pt.result.sent(3, 1))).toBeInTheDocument()
      expect(screen.getByText(/O outro lado tem \d+:\d\d pra reportar\./)).toBeInTheDocument()
      const [path, init] = vi.mocked(fetch).mock.calls[0]!
      expect(path).toBe('/bff/queue/report')
      const sent = init!.body as FormData
      expect([sent.get('scoreA'), sent.get('scoreB'), sent.get('absent')]).toEqual([
        '1',
        '3',
        'p-opp',
      ])
      expect((sent.get('print') as File).name).toBe('placar.png')
    })

    it('says why a report was refused', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(answer(409, { message: 'print_already_used' }))
      renderScreen(inLobby({ state: 'in_progress', reportableFrom: ago(60) }))
      fireEvent.change(screen.getByLabelText(pt.result.mine), { target: { value: '0' } })
      fireEvent.change(screen.getByLabelText(pt.result.theirs), { target: { value: '0' } })
      fireEvent.change(screen.getByLabelText(pt.result.printLabel, { exact: false }), {
        target: { files: [new File(['png'], 'p.png', { type: 'image/png' })] },
      })
      fireEvent.click(screen.getByRole('button', { name: pt.result.send }))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        pt.result.errors.print_already_used!,
      )
    })

    it('a score in dispute keeps the lobby and says moderation decides', () => {
      renderScreen(inLobby({ state: 'in_dispute' }))
      expect(screen.getByRole('heading', { name: pt.result.disputeTitle })).toBeInTheDocument()
      expect(screen.getByText(pt.result.disputeHint)).toBeInTheDocument()
    })

    const settled = {
      lobbyId: 'l1',
      state: 'not_confirmed',
      side: 'b' as const,
      scoreA: 2,
      scoreB: 0,
      contestUntil: inSeconds(47 * 3600),
      teammates: [player('p-mate', 'Lateral10')],
      opponents: [player('p-opp', 'Ponta7')],
      rateUntil: null,
    }

    it('after the match: the result this side first, and the contest', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(answer(204, {}))
        .mockResolvedValueOnce(
          answer(200, {
            entry: null,
            blockedUntil: null,
            lastMatch: { ...settled, state: 'in_dispute', contestUntil: null },
          }),
        )
      renderScreen({ entry: null, blockedUntil: null, lastMatch: settled })

      expect(screen.getByText('0 × 2')).toBeInTheDocument()
      expect(screen.getByText(pt.result.states.not_confirmed!)).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: pt.result.contest }))

      expect(await screen.findByText(pt.result.states.in_dispute!)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: pt.result.contest })).toBeNull()
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        '/bff/queue/contest',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ lobbyId: 'l1' }) }),
      )
    })

    it('rates a teammate once, only within the 48 h', async () => {
      const finished = {
        ...settled,
        state: 'finished',
        contestUntil: null,
        rateUntil: inSeconds(3600),
      }
      vi.mocked(fetch)
        .mockResolvedValueOnce(answer(204, {}))
        .mockResolvedValueOnce(
          answer(200, {
            entry: null,
            blockedUntil: null,
            lastMatch: {
              ...finished,
              teammates: [{ ...finished.teammates[0]!, myRating: 'thumbs_up' }],
            },
          }),
        )
      renderScreen({ entry: null, blockedUntil: null, lastMatch: finished })

      const rate = screen.getByRole('region', { name: pt.result.rateTitle })
      expect(within(rate).queryByText('Ponta7')).toBeNull()
      fireEvent.click(within(rate).getByRole('button', { name: pt.result.thumbsUp }))

      expect(
        await within(rate).findByRole('button', { name: pt.result.thumbsUp, pressed: true }),
      ).toBeDisabled()
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        '/bff/queue/ratings',
        expect.objectContaining({
          body: JSON.stringify({ lobbyId: 'l1', participationId: 'p-mate', kind: 'thumbs_up' }),
        }),
      )
    })

    it('reports anyone of the match, and says when 3 are already open', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(answer(409, { message: 'too_many_open_reports' }))
        .mockResolvedValueOnce(answer(201, { caseId: 'c1' }))
      renderScreen({ entry: null, blockedUntil: null, lastMatch: settled })

      fireEvent.click(screen.getByRole('button', { name: pt.result.reportPerson }))
      fireEvent.change(screen.getByLabelText(pt.result.person), { target: { value: 'p-opp' } })
      fireEvent.change(screen.getByLabelText(pt.result.reason), { target: { value: 'behavior' } })
      fireEvent.change(screen.getByLabelText(pt.result.message, { exact: false }), {
        target: { value: '  xingou o time inteiro no chat de voz  ' },
      })
      fireEvent.click(screen.getByRole('button', { name: pt.result.reportSend }))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        pt.result.errors.too_many_open_reports!,
      )

      fireEvent.click(screen.getByRole('button', { name: pt.result.reportSend }))
      expect(await screen.findByText(pt.result.reportSent)).toBeInTheDocument()
      expect(fetch).toHaveBeenLastCalledWith(
        '/bff/queue/user-reports',
        expect.objectContaining({
          body: JSON.stringify({
            lobbyId: 'l1',
            participationId: 'p-opp',
            reason: 'behavior',
            message: 'xingou o time inteiro no chat de voz',
          }),
        }),
      )
    })

    it('a message long only by its spaces says it is short, and is not sent', () => {
      renderScreen({ entry: null, blockedUntil: null, lastMatch: settled })

      fireEvent.click(screen.getByRole('button', { name: pt.result.reportPerson }))
      fireEvent.change(screen.getByLabelText(pt.result.message, { exact: false }), {
        target: { value: 'trapaceou feio            ' },
      })
      fireEvent.click(screen.getByRole('button', { name: pt.result.reportSend }))

      expect(screen.getByRole('alert')).toHaveTextContent(pt.result.errors.message_too_short!)
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('a queue that does not close (RF-007, #234)', () => {
    const MINUTE = 60_000
    const searching = (waitedMs: number, stall: 'unpaired' | 'captain_missing' | null) => ({
      entry: {
        characterId: 'c1',
        category: 'midfielder' as const,
        joinedAt: new Date(Date.now() - waitedMs).toISOString(),
        cancelledLobby: null,
        stall,
        lobby: null,
      },
      blockedUntil: null,
    })

    it('turns at 10 min and every 5 min after', () => {
      expect([9, 10, 14, 15, 21].map((m) => stallTurn(m * MINUTE))).toEqual([-1, 0, 0, 1, 2])
    })

    it('says nothing before 10 min, then what is missing', async () => {
      const early = renderScreen(searching(9 * MINUTE, 'unpaired'))
      expect(screen.queryByText(pt.stall.unpaired)).toBeNull()
      early.unmount()

      renderScreen(searching(11 * MINUTE, 'captain_missing'))
      expect(await screen.findByText(pt.stall.captain_missing)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: pt.leave })).toBeInTheDocument()
    })

    it('keep waiting hides it until the next 5 min turn', async () => {
      renderScreen(searching(11 * MINUTE, 'unpaired'))
      fireEvent.click(await screen.findByRole('button', { name: pt.stall.keepWaiting }))

      expect(screen.queryByText(pt.stall.unpaired)).toBeNull()
    })

    it('says nothing when the last run found nothing missing', () => {
      renderScreen(searching(30 * MINUTE, null))

      expect(screen.queryByRole('button', { name: pt.stall.keepWaiting })).toBeNull()
    })
  })

  describe('a paused queue (RNF-008, #271)', () => {
    it.each(['discord_unavailable', 'channels_full', 'lobbies_full'] as const)(
      'says why no lobby closes (%s), in place of the stall notice',
      (paused) => {
        renderScreen({
          entry: {
            characterId: 'c1',
            category: 'midfielder',
            joinedAt: new Date(Date.now() - 20 * 60_000).toISOString(),
            cancelledLobby: null,
            stall: 'unpaired',
            lobby: null,
          },
          blockedUntil: null,
          paused,
        })

        expect(screen.getByText(pt.paused[paused])).toBeInTheDocument()
        expect(screen.queryByText(pt.stall.unpaired)).toBeNull()
        expect(screen.getByRole('button', { name: pt.leave })).toBeInTheDocument()
      },
    )

    it('says it before joining too, and joining still works', () => {
      renderScreen({ entry: null, blockedUntil: null, paused: 'discord_unavailable' })

      expect(screen.getByText(pt.paused.discord_unavailable)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: pt.joinAs('MEI') })).toBeEnabled()
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
    ] as const)('a %s lobby says why, until dismissed', async (state, text) => {
      renderScreen(searchingAgain({ state, endedAt: new Date().toISOString() }))

      expect(await screen.findByText(text)).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: pt.notice.dismiss }))
      expect(screen.queryByText(text)).toBeNull()
    })

    it('a reload does not tell the same cancellation again', async () => {
      const again = searchingAgain({
        state: 'cancelled_by_captain',
        endedAt: new Date().toISOString(),
      })
      const first = renderScreen(again)
      expect(await screen.findByText(pt.notice.byCaptain)).toBeInTheDocument()
      first.unmount()

      renderScreen(again)
      await waitFor(() =>
        expect(screen.getByRole('button', { name: pt.leave })).toBeInTheDocument(),
      )
      expect(screen.queryByText(pt.notice.byCaptain)).toBeNull()
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
