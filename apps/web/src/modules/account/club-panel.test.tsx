import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { CLUB_CONTENT } from '@/content/club'
import { ClubPanel } from './club-panel'

const pt = CLUB_CONTENT.pt
const answer = (status: number) => ({ ok: status < 300, status }) as Response

describe('ClubPanel (#229)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const fill = (name: string, slots: string) => {
    fireEvent.change(screen.getByLabelText(pt.clubNameLabel, { exact: false }), {
      target: { value: name },
    })
    fireEvent.change(screen.getByLabelText(pt.freeSlotsLabel, { exact: false }), {
      target: { value: slots },
    })
  }

  it('declares a club, trimmed, and says it was saved', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(answer(200))
    renderWithLocale(<ClubPanel initial={null} />)

    expect(screen.queryByRole('button', { name: pt.remove })).toBeNull()
    fill('  Clube Azul  ', '4')
    fireEvent.click(screen.getByRole('button', { name: pt.save }))

    expect(await screen.findByRole('status')).toHaveTextContent(pt.saved)
    expect(fetch).toHaveBeenCalledWith(
      '/bff/accounts/me/club',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ clubName: 'Clube Azul', freeSlots: 4 }),
      }),
    )
  })

  it('says what is wrong when the API refuses the values', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(answer(400))
    renderWithLocale(<ClubPanel initial={null} />)

    fill('Clube', '4')
    fireEvent.click(screen.getByRole('button', { name: pt.save }))

    expect(await screen.findByRole('alert')).toHaveTextContent(pt.invalid)
  })

  it('shows the declared club and removes it', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(answer(204))
    renderWithLocale(<ClubPanel initial={{ clubName: 'Clube Azul', freeSlots: 3 }} />)

    expect(screen.getByLabelText(pt.clubNameLabel, { exact: false })).toHaveValue('Clube Azul')
    expect(screen.getByLabelText(pt.freeSlotsLabel, { exact: false })).toHaveValue(3)
    fireEvent.click(screen.getByRole('button', { name: pt.remove }))

    expect(await screen.findByRole('status')).toHaveTextContent(pt.removed)
    expect(fetch).toHaveBeenCalledWith('/bff/accounts/me/club', { method: 'DELETE' })
    expect(screen.getByLabelText(pt.clubNameLabel, { exact: false })).toHaveValue('')
    expect(screen.queryByRole('button', { name: pt.remove })).toBeNull()
  })

  it('caps the fields where the API does, so the keyboard user hears it first', () => {
    renderWithLocale(<ClubPanel initial={null} />)

    expect(screen.getByLabelText(pt.clubNameLabel, { exact: false })).toHaveAttribute(
      'maxLength',
      '20',
    )
    const slots = screen.getByLabelText(pt.freeSlotsLabel, { exact: false })
    expect(slots).toHaveAttribute('min', '0')
    expect(slots).toHaveAttribute('max', '10')
  })

  it('speaks Spanish', () => {
    renderWithLocale(<ClubPanel initial={null} />, 'es')

    expect(screen.getByRole('heading', { name: CLUB_CONTENT.es.title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: CLUB_CONTENT.es.save })).toBeInTheDocument()
  })
})
