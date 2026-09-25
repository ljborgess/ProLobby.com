import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { CHARACTER_CONTENT } from '@/content/character'
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

  it('offers only the archetypes the chosen category allows', () => {
    renderWithLocale(<CharacterForm archetypes={ARCHETYPES} onCreated={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(pt.form.categoryLabel), {
      target: { value: 'winger' },
    })

    const archetype = screen.getByLabelText(pt.form.archetypeLabel)
    const offered = Array.from(archetype.querySelectorAll('option'))
      .map((option) => option.textContent)
      .slice(1)
    expect(offered).toEqual(['MAESTRO', 'SPARK'])
  })

  it('asks for the required fields before calling the API', () => {
    renderWithLocale(<CharacterForm archetypes={ARCHETYPES} onCreated={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: pt.form.submit }))

    expect(screen.getAllByText(pt.form.fieldRequired).length).toBeGreaterThanOrEqual(4)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('creates the character and hands it on', async () => {
    const created = {
      id: '11111111-1111-1111-1111-111111111111',
      category: 'winger',
      archetype: 'spark',
      platform: 'ps5',
      state: 'pending_verification',
    }
    vi.mocked(fetch).mockResolvedValue(json(201, created))
    const onCreated = vi.fn()
    renderWithLocale(<CharacterForm archetypes={ARCHETYPES} onCreated={onCreated} />)

    fireEvent.change(screen.getByLabelText(pt.form.categoryLabel), {
      target: { value: 'winger' },
    })
    fireEvent.change(screen.getByLabelText(pt.form.archetypeLabel), { target: { value: 'spark' } })
    fireEvent.change(screen.getByLabelText(pt.form.platformLabel), { target: { value: 'ps5' } })
    fireEvent.change(screen.getByLabelText(pt.form.gamertagLabel), {
      target: { value: 'Torvalen' },
    })
    fireEvent.click(screen.getByRole('button', { name: pt.form.submit }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created))
    expect(fetch).toHaveBeenCalledWith(
      '/bff/characters',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('explains a category that already has an active character', async () => {
    vi.mocked(fetch).mockResolvedValue(json(409, { message: 'category_taken' }))
    renderWithLocale(<CharacterForm archetypes={ARCHETYPES} onCreated={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(pt.form.categoryLabel), {
      target: { value: 'goalkeeper' },
    })
    fireEvent.change(screen.getByLabelText(pt.form.archetypeLabel), {
      target: { value: 'shot_stopper' },
    })
    fireEvent.change(screen.getByLabelText(pt.form.platformLabel), { target: { value: 'pc' } })
    fireEvent.change(screen.getByLabelText(pt.form.gamertagLabel), {
      target: { value: 'Torvalen' },
    })
    fireEvent.click(screen.getByRole('button', { name: pt.form.submit }))

    expect(await screen.findByText(pt.form.categoryTaken)).toBeInTheDocument()
  })

  const fillValid = () => {
    fireEvent.change(screen.getByLabelText(pt.form.categoryLabel), { target: { value: 'winger' } })
    fireEvent.change(screen.getByLabelText(pt.form.archetypeLabel), { target: { value: 'spark' } })
    fireEvent.change(screen.getByLabelText(pt.form.platformLabel), { target: { value: 'ps5' } })
    fireEvent.change(screen.getByLabelText(pt.form.gamertagLabel), {
      target: { value: 'Torvalen' },
    })
  }

  it('says what is wrong with the name instead of asking to try again', () => {
    renderWithLocale(<CharacterForm archetypes={ARCHETYPES} onCreated={vi.fn()} />)

    fillValid()
    fireEvent.change(screen.getByLabelText(pt.form.nameLabel), { target: { value: 'Pro<script>' } })
    fireEvent.click(screen.getByRole('button', { name: pt.form.submit }))

    expect(screen.getByText(pt.form.nameInvalid)).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('explains the hourly creation limit', async () => {
    vi.mocked(fetch).mockResolvedValue(json(429, { message: 'character_create_limit' }))
    renderWithLocale(<CharacterForm archetypes={ARCHETYPES} onCreated={vi.fn()} />)

    fillValid()
    fireEvent.click(screen.getByRole('button', { name: pt.form.submit }))

    expect(await screen.findByText(pt.form.createLimit)).toBeInTheDocument()
  })
})

describe('PrintUpload', () => {
  const ID = '11111111-1111-1111-1111-111111111111'
  const pick = () =>
    fireEvent.change(screen.getByLabelText(pt.print.fileLabel), {
      target: { files: [new File(['x'.repeat(100)], 'print.png', { type: 'image/png' })] },
    })

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
})
