import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { CHARACTER_CONTENT } from '@/content/character'
import { CharacterFlow } from './character-flow'
import { CharacterForm } from './character-form'
import { PrintUpload } from './print-upload'
import type { ArchetypeOption } from './types'

const pt = CHARACTER_CONTENT.pt

const ARCHETYPES: ArchetypeOption[] = [
  { archetype: 'shot_stopper', categories: ['goalkeeper'] },
  { archetype: 'maestro', categories: ['midfielder', 'winger'] },
  { archetype: 'spark', categories: ['winger', 'striker'] },
]

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('CharacterForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const next = () => fireEvent.click(screen.getByRole('button', { name: pt.form.next }))
  const pick = (label: string) => fireEvent.click(screen.getByRole('radio', { name: label }))

  /** Walks to the confirm step with a valid winger. */
  const complete = (name = '') => {
    pick(pt.categories.winger)
    next()
    pick('SPARK')
    next()
    pick(pt.platforms.ps5)
    next()
    fireEvent.change(screen.getByLabelText(pt.form.gamertagLabel), {
      target: { value: 'Torvalen' },
    })
    if (name) {
      fireEvent.change(screen.getByLabelText(pt.form.nameLabel), { target: { value: name } })
    }
    next()
  }

  it('asks one thing per step, in order, with the rail showing where you are', () => {
    renderWithLocale(<CharacterForm archetypes={ARCHETYPES} onCreated={vi.fn()} />)

    expect(screen.getByRole('heading', { name: pt.form.questions.category })).toBeInTheDocument()
    expect(screen.getByText(pt.form.steps.category).closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    )
    pick(pt.categories.winger)
    next()
    expect(screen.getByRole('heading', { name: pt.form.questions.archetype })).toBeInTheDocument()
  })

  it('offers only the archetypes the chosen category allows', () => {
    renderWithLocale(<CharacterForm archetypes={ARCHETYPES} onCreated={vi.fn()} />)

    pick(pt.categories.winger)
    next()

    const offered = screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))
    expect(offered).toEqual(['maestro', 'spark'])
  })

  it('does not move on without an answer, and never calls the API early', () => {
    renderWithLocale(<CharacterForm archetypes={ARCHETYPES} onCreated={vi.fn()} />)

    next()

    expect(screen.getByRole('alert')).toHaveTextContent(pt.form.fieldRequired)
    expect(screen.getByRole('heading', { name: pt.form.questions.category })).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('starts on the archetype when the slot already said the position', () => {
    renderWithLocale(
      <CharacterForm archetypes={ARCHETYPES} onCreated={vi.fn()} initialCategory="goalkeeper" />,
    )

    expect(screen.getByRole('heading', { name: pt.form.questions.archetype })).toBeInTheDocument()
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([
      'shot_stopper',
    ])
  })

  const keeper = {
    id: '55555555-5555-5555-5555-555555555555',
    category: 'goalkeeper' as const,
    archetype: 'shot_stopper',
    platform: 'ps5' as const,
    state: 'verified' as const,
    elo: 1000,
  }

  it('warns that a taken position replaces the character in it (RF-027)', () => {
    renderWithLocale(<CharacterForm archetypes={ARCHETYPES} onCreated={vi.fn()} squad={[keeper]} />)

    expect(screen.getAllByText(pt.form.replaces)).toHaveLength(1)
  })

  it('says what a replacement replaces, before and at the confirmation', () => {
    renderWithLocale(
      <CharacterForm
        archetypes={ARCHETYPES}
        onCreated={vi.fn()}
        initialCategory="goalkeeper"
        squad={[keeper]}
      />,
    )

    expect(screen.getByText(pt.form.replacingNow('SHOT STOPPER'))).toBeInTheDocument()
    pick('SHOT STOPPER')
    next()
    pick(pt.platforms.ps5)
    next()
    fireEvent.change(screen.getByLabelText(pt.form.gamertagLabel), {
      target: { value: 'Torvalen' },
    })
    next()

    expect(screen.getByRole('note')).toHaveTextContent(pt.form.replacing('SHOT STOPPER', true))
  })

  it('clears the archetype when the position changes', () => {
    renderWithLocale(<CharacterForm archetypes={ARCHETYPES} onCreated={vi.fn()} />)

    complete()
    fireEvent.click(
      screen.getByRole('button', { name: `${pt.form.change} ${pt.form.steps.category}` }),
    )
    pick(pt.categories.midfielder)
    next()

    expect(
      screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked),
    ).toBe(true)
  })

  it('shows everything before creating, then creates and hands it on', async () => {
    const created = {
      id: '11111111-1111-1111-1111-111111111111',
      category: 'winger',
      archetype: 'spark',
      platform: 'ps5',
      state: 'pending_verification',
      elo: 1000,
    }
    vi.mocked(fetch).mockResolvedValue(json(201, created))
    const onCreated = vi.fn()
    renderWithLocale(<CharacterForm archetypes={ARCHETYPES} onCreated={onCreated} />)

    complete()
    expect(screen.getByRole('heading', { name: pt.form.questions.confirm })).toBeInTheDocument()
    expect(screen.getByText('Torvalen')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: pt.form.create }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created))
    const [, init] = vi.mocked(fetch).mock.calls[0]!
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      category: 'winger',
      archetype: 'spark',
      platform: 'ps5',
      gamertag: 'Torvalen',
    })
  })

  it('answers a race on the position with a retry, not "position taken"', async () => {
    vi.mocked(fetch).mockResolvedValue(json(409, { message: 'category_taken' }))
    renderWithLocale(<CharacterForm archetypes={ARCHETYPES} onCreated={vi.fn()} />)

    complete()
    fireEvent.click(screen.getByRole('button', { name: pt.form.create }))

    expect(await screen.findByRole('alert')).toHaveTextContent(pt.form.genericError)
    expect(screen.getByRole('heading', { name: pt.form.questions.confirm })).toBeInTheDocument()
  })

  it.each([
    ['archetype_category_mismatch', 'archetype'],
    ['gamertag_change_requires_moderation', 'gamertag'],
  ] as const)('sends %s back to the %s step', async (message, step) => {
    vi.mocked(fetch).mockResolvedValue(json(409, { message }))
    renderWithLocale(<CharacterForm archetypes={ARCHETYPES} onCreated={vi.fn()} />)

    complete()
    fireEvent.click(screen.getByRole('button', { name: pt.form.create }))

    expect(
      await screen.findByRole('heading', { name: pt.form.questions[step] }),
    ).toBeInTheDocument()
    if (step === 'gamertag') {
      expect(screen.getByLabelText(pt.form.gamertagLabel)).toHaveAttribute('aria-invalid', 'true')
    }
  })

  it('says what is wrong with the name instead of asking to try again', () => {
    renderWithLocale(<CharacterForm archetypes={ARCHETYPES} onCreated={vi.fn()} />)

    complete('Pro<script>')

    expect(screen.getByRole('alert')).toHaveTextContent(pt.form.nameInvalid)
    expect(screen.getByLabelText(pt.form.nameLabel)).toHaveAttribute('aria-invalid', 'true')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('explains the hourly creation limit', async () => {
    vi.mocked(fetch).mockResolvedValue(json(429, { message: 'character_create_limit' }))
    renderWithLocale(<CharacterForm archetypes={ARCHETYPES} onCreated={vi.fn()} />)

    complete()
    fireEvent.click(screen.getByRole('button', { name: pt.form.create }))

    expect(await screen.findByText(pt.form.createLimit)).toBeInTheDocument()
  })
})

describe('PrintUpload', () => {
  const ID = '11111111-1111-1111-1111-111111111111'
  const pick = (confirm = true) => {
    fireEvent.change(screen.getByLabelText(pt.print.fileLabel), {
      target: { files: [new File(['x'.repeat(100)], 'print.png', { type: 'image/png' })] },
    })
    if (confirm) {
      fireEvent.click(screen.getByLabelText(pt.print.activeConfirm))
    }
  }

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the three instructions and the example before the file picker', () => {
    renderWithLocale(<PrintUpload characterId={ID} onBack={() => {}} />)

    for (const instruction of pt.print.instructions) {
      expect(screen.getByText(instruction)).toBeInTheDocument()
    }
    expect(screen.getByRole('img', { name: pt.print.exampleCaption })).toBeInTheDocument()
  })

  it('confirms a received print', async () => {
    vi.mocked(fetch).mockResolvedValue(json(201, { status: 'received', rejection: null }))
    renderWithLocale(<PrintUpload characterId={ID} onBack={() => {}} />)

    pick()
    fireEvent.click(screen.getByRole('button', { name: pt.print.submit }))

    expect(await screen.findByRole('status')).toHaveTextContent(pt.print.received)
    expect(fetch).toHaveBeenCalledWith(`/bff/characters/${ID}/prints`, expect.anything())
  })

  it.each(['invalid_format', 'image_too_small', 'print_already_used'] as const)(
    'says what to redo on %s',
    async (rejection) => {
      vi.mocked(fetch).mockResolvedValue(json(201, { status: 'rejected', rejection }))
      renderWithLocale(<PrintUpload characterId={ID} onBack={() => {}} />)

      pick()
      fireEvent.click(screen.getByRole('button', { name: pt.print.submit }))

      expect(await screen.findByRole('alert')).toHaveTextContent(pt.print.rejections[rejection])
    },
  )

  it('tells how long to wait after the hourly limit', async () => {
    vi.mocked(fetch).mockResolvedValue(
      json(429, { message: 'upload_limit', retryAfterSeconds: 610 }),
    )
    renderWithLocale(<PrintUpload characterId={ID} onBack={() => {}} />)

    pick()
    fireEvent.click(screen.getByRole('button', { name: pt.print.submit }))

    expect(await screen.findByRole('alert')).toHaveTextContent(pt.print.uploadLimit(11))
  })

  it('asks for a file when none was picked', async () => {
    renderWithLocale(<PrintUpload characterId={ID} onBack={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: pt.print.submit }))

    expect(await screen.findByRole('alert')).toHaveTextContent(pt.print.fileRequired)
    expect(screen.getByLabelText(pt.print.fileLabel)).toHaveAttribute('aria-invalid', 'true')
  })

  it('still says something for a cause it does not know yet', async () => {
    vi.mocked(fetch).mockResolvedValue(json(201, { status: 'rejected', rejection: 'new_cause' }))
    renderWithLocale(<PrintUpload characterId={ID} onBack={() => {}} />)

    pick()
    fireEvent.click(screen.getByRole('button', { name: pt.print.submit }))

    expect(await screen.findByRole('alert')).toHaveTextContent(pt.print.genericError)
  })

  it('moves focus to the confirmation and offers the way back', async () => {
    vi.mocked(fetch).mockResolvedValue(json(201, { status: 'received', rejection: null }))
    const onBack = vi.fn()
    renderWithLocale(<PrintUpload characterId={ID} onBack={onBack} />)

    pick()
    fireEvent.click(screen.getByRole('button', { name: pt.print.submit }))

    const status = await screen.findByRole('status')
    await waitFor(() => expect(status).toHaveFocus())
    fireEvent.click(screen.getByRole('button', { name: pt.print.backToList }))
    expect(onBack).toHaveBeenCalled()
  })

  it('does not send without the active-archetype confirmation (#197)', async () => {
    renderWithLocale(<PrintUpload characterId={ID} onBack={() => {}} />)

    pick(false)
    fireEvent.click(screen.getByRole('button', { name: pt.print.submit }))

    expect(await screen.findByRole('alert')).toHaveTextContent(pt.print.activeConfirmRequired)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('sends the confirmation with the file', async () => {
    vi.mocked(fetch).mockResolvedValue(json(201, { status: 'received', rejection: null }))
    renderWithLocale(<PrintUpload characterId={ID} onBack={() => {}} />)

    pick()
    fireEvent.click(screen.getByRole('button', { name: pt.print.submit }))

    await screen.findByRole('status')
    const body = (vi.mocked(fetch).mock.calls[0]![1] as RequestInit).body as FormData
    expect(body.get('activeArchetypeConfirmed')).toBe('true')
  })

  it('tells how many hours are left in the cooldown (RF-030)', async () => {
    vi.mocked(fetch).mockResolvedValue(
      json(429, { message: 'print_cooldown', retryAfterSeconds: 5 * 3600 - 10 }),
    )
    renderWithLocale(<PrintUpload characterId={ID} onBack={() => {}} />)

    pick()
    fireEvent.click(screen.getByRole('button', { name: pt.print.submit }))

    expect(await screen.findByRole('alert')).toHaveTextContent(pt.print.cooldown(5))
  })

  it('says a print is already in review', async () => {
    vi.mocked(fetch).mockResolvedValue(json(409, { message: 'print_in_review' }))
    renderWithLocale(<PrintUpload characterId={ID} onBack={() => {}} />)

    pick()
    fireEvent.click(screen.getByRole('button', { name: pt.print.submit }))

    expect(await screen.findByRole('alert')).toHaveTextContent(pt.print.inReview)
  })
})

describe('Roster (tactics board)', () => {
  const verified = {
    id: '44444444-4444-4444-4444-444444444444',
    category: 'goalkeeper' as const,
    archetype: 'shot_stopper',
    platform: 'ps5' as const,
    state: 'verified' as const,
    elo: 1000,
  }

  const marker = (category: keyof typeof pt.categories) =>
    screen.getByRole('button', { name: new RegExp(`^${pt.categories[category]}:`) })

  it('puts the five places on the pitch and counts the filled ones', () => {
    renderWithLocale(<CharacterFlow characters={[verified]} archetypes={ARCHETYPES} />)

    expect(screen.getByText(pt.roster.count(1, 5))).toBeInTheDocument()
    expect(marker('goalkeeper')).toHaveAccessibleName(
      `${pt.categories.goalkeeper}: SHOT STOPPER, ${pt.existing.verified}`,
    )
    expect(marker('winger')).toHaveAccessibleName(`${pt.categories.winger}: ${pt.roster.free}`)
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(4)
  })

  it('opens the card of the place picked on the pitch', () => {
    renderWithLocale(<CharacterFlow characters={[verified]} archetypes={ARCHETYPES} />)

    fireEvent.click(marker('goalkeeper'))

    expect(marker('goalkeeper')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { level: 3, name: 'SHOT STOPPER' })).toBeInTheDocument()
  })

  it('opens the form already on the category of a free place', () => {
    renderWithLocale(<CharacterFlow characters={[verified]} archetypes={ARCHETYPES} />)

    fireEvent.click(marker('winger'))
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(`${pt.roster.claim}\\s*${pt.categories.winger}`),
      }),
    )

    expect(screen.getByText(pt.form.archetypeFor(pt.categories.winger))).toBeInTheDocument()
  })

  const pending = {
    id: '66666666-6666-6666-6666-666666666666',
    category: 'midfielder' as const,
    archetype: 'maestro',
    platform: 'ps5' as const,
    state: 'pending_verification' as const,
    elo: 1150,
  }

  it('offers the print on a pending card, and opens the upload', () => {
    renderWithLocale(<CharacterFlow characters={[pending]} archetypes={ARCHETYPES} />)

    fireEvent.click(screen.getByRole('button', { name: pt.existing.sendPrint }))

    expect(screen.getByText(pt.print.heading)).toBeInTheDocument()
  })

  it('shows the category elo on a pending card, inherited from the one replaced (#207)', () => {
    renderWithLocale(<CharacterFlow characters={[pending]} archetypes={ARCHETYPES} />)

    expect(screen.getByText(pt.roster.elo)).toHaveTextContent('1150')
  })

  it('offers no print while one is in review', () => {
    renderWithLocale(
      <CharacterFlow
        characters={[{ ...pending, lastPrint: { status: 'received', rejection: null } }]}
        archetypes={ARCHETYPES}
      />,
    )

    expect(screen.queryByRole('button', { name: pt.existing.sendPrint })).toBeNull()
    expect(marker('midfielder')).toHaveAccessibleName(
      `${pt.categories.midfielder}: MAESTRO, ${pt.roster.legendReview}`,
    )
  })

  it('names a rejected place as rejected on the pitch', () => {
    renderWithLocale(
      <CharacterFlow
        characters={[{ ...pending, lastPrint: { status: 'rejected', rejection: 'unreadable' } }]}
        archetypes={ARCHETYPES}
      />,
    )

    expect(marker('midfielder')).toHaveAccessibleName(
      `${pt.categories.midfielder}: MAESTRO, ${pt.existing.rejectedShort}`,
    )
  })

  it('warns on "replace" and puts focus back on the place when cancelled', () => {
    renderWithLocale(<CharacterFlow characters={[verified]} archetypes={ARCHETYPES} />)

    fireEvent.click(marker('goalkeeper'))
    fireEvent.click(screen.getByRole('button', { name: pt.roster.replace }))
    expect(screen.getByText(pt.form.replacingNow('SHOT STOPPER'))).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: pt.roster.cancel }))

    expect(screen.queryByText(pt.form.replacingNow('SHOT STOPPER'))).toBeNull()
    expect(marker('goalkeeper')).toHaveFocus()
  })
})
