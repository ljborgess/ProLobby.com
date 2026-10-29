import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { CLUB_CONTENT } from '@/content/club'
import { ClubPanel } from './club-panel'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const pt = CLUB_CONTENT.pt
const answer = (status: number, body: unknown = {}) =>
  ({ ok: status < 300, status, json: async () => body }) as Response

describe('ClubPanel (#229)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const nameField = () => screen.getByRole('textbox', { name: new RegExp(`^${pt.clubNameLabel}`) })
  const seat = (count: number) =>
    screen.getByRole('radio', { name: count === 0 ? pt.full : pt.seats(count) })
  const fill = (name: string, slots: number) => {
    fireEvent.change(nameField(), { target: { value: name } })
    fireEvent.click(seat(slots))
  }
  const saveButton = () => screen.getByRole('button', { name: pt.save })

  it('declares a club, trimmed, and shows what the server kept', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      answer(200, { clubName: 'Clube Azul', freeSlots: 4, updatedAt: '2026-10-27T10:00:00Z' }),
    )
    renderWithLocale(<ClubPanel initial={null} />)

    expect(screen.queryByRole('button', { name: pt.remove })).toBeNull()
    fill('  Clube Azul  ', 4)
    fireEvent.click(saveButton())

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(pt.saved))
    expect(fetch).toHaveBeenCalledWith(
      '/bff/accounts/me/club',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          clubName: 'Clube Azul',
          freeSlots: 4,
          kitPrimary: 'white',
          kitSecondary: 'navy',
          kitPattern: 'plain',
          crestShape: 'shield',
        }),
      }),
    )
    expect(nameField()).toHaveValue('Clube Azul')
    expect(screen.getByRole('button', { name: pt.remove })).toBeInTheDocument()
  })

  it('dresses the club: colours, pattern and crest go with the save, and count as a change', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(answer(200, {}))
    renderWithLocale(<ClubPanel initial={{ clubName: 'Clube Azul', freeSlots: 3 }} />)

    expect(saveButton()).toBeDisabled()
    const group = (name: string) => within(screen.getByRole('radiogroup', { name }))
    fireEvent.click(group(pt.kit.primary).getByRole('radio', { name: pt.kit.colors.claret }))
    fireEvent.click(group(pt.kit.secondary).getByRole('radio', { name: pt.kit.colors.sky }))
    fireEvent.click(screen.getByRole('radio', { name: pt.kit.patterns.stripes }))
    fireEvent.click(screen.getByRole('radio', { name: pt.kit.crests.round }))
    expect(saveButton()).toBeEnabled()
    fireEvent.click(saveButton())

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string)).toMatchObject({
      kitPrimary: 'claret',
      kitSecondary: 'sky',
      kitPattern: 'stripes',
      crestShape: 'round',
    })
  })

  it('says what the chosen room means for captaincy, as it changes', () => {
    renderWithLocale(<ClubPanel initial={null} />)

    expect(screen.getByText(pt.captaincy(null))).toBeInTheDocument()
    fireEvent.click(seat(2))
    expect(screen.getByText(pt.captaincy(2))).toBeInTheDocument()
    fireEvent.click(seat(5))
    expect(screen.getByText(pt.captaincy(5))).toHaveTextContent('até 6 jogadores')
    fireEvent.click(seat(10))
    expect(screen.getByText(pt.captaincy(10))).toBeInTheDocument()
  })

  it('offers "full" and ten seats, one choice at a time', () => {
    renderWithLocale(<ClubPanel initial={null} />)

    const seats = screen
      .getAllByRole('radio')
      .filter((radio) => radio.getAttribute('name') === 'freeSlots')
    expect(seats).toHaveLength(11)
    fireEvent.click(seat(0))
    expect(seat(0)).toBeChecked()
    fireEvent.click(seat(7))
    expect(seat(7)).toBeChecked()
    expect(seat(0)).not.toBeChecked()
  })

  it('saves only something new and complete', () => {
    renderWithLocale(<ClubPanel initial={{ clubName: 'Clube Azul', freeSlots: 3 }} />)

    expect(saveButton()).toBeDisabled()
    fireEvent.click(seat(4))
    expect(saveButton()).toBeEnabled()
    fireEvent.change(nameField(), { target: { value: '   ' } })
    expect(saveButton()).toBeDisabled()
  })

  it('says what is wrong when the API refuses the values, and keeps what was typed', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(answer(400))
    renderWithLocale(<ClubPanel initial={null} />)

    fill('Clube', 4)
    fireEvent.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(pt.invalid)
    expect(nameField()).toHaveValue('Clube')
    expect(seat(4)).toBeChecked()
  })

  it('a network failure is a "try again", not a lost club', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))
    renderWithLocale(<ClubPanel initial={{ clubName: 'Clube Azul', freeSlots: 3 }} />)

    fireEvent.click(screen.getByRole('button', { name: pt.remove }))

    expect(await screen.findByRole('alert')).toHaveTextContent(pt.error)
    expect(nameField()).toHaveValue('Clube Azul')
    expect(screen.getByRole('button', { name: pt.remove })).toBeInTheDocument()
  })

  it('an expired session goes to the login, not to an endless retry', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(answer(401))
    renderWithLocale(<ClubPanel initial={null} />)

    fill('Clube', 4)
    fireEvent.click(saveButton())

    await waitFor(() => expect(push).toHaveBeenCalledWith('/login'))
  })

  it('shows the declared club, removes it and puts the keyboard back on the form', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(answer(204))
    renderWithLocale(<ClubPanel initial={{ clubName: 'Clube Azul', freeSlots: 3 }} />)

    expect(nameField()).toHaveValue('Clube Azul')
    expect(seat(3)).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: pt.remove }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(pt.removed))
    expect(fetch).toHaveBeenCalledWith('/bff/accounts/me/club', { method: 'DELETE' })
    expect(nameField()).toHaveValue('')
    expect(nameField()).toHaveFocus()
    const seats = screen
      .getAllByRole('radio')
      .filter((radio) => radio.getAttribute('name') === 'freeSlots')
    expect(seats.some((radio) => (radio as HTMLInputElement).checked)).toBe(false)
  })

  it('holds both buttons while a request is out', () => {
    vi.mocked(fetch).mockReturnValueOnce(new Promise(() => {}))
    renderWithLocale(<ClubPanel initial={{ clubName: 'Clube Azul', freeSlots: 3 }} />)

    fireEvent.click(seat(5))
    fireEvent.click(saveButton())

    expect(screen.getByRole('button', { name: pt.saving })).toBeDisabled()
    expect(screen.getByRole('button', { name: pt.remove })).toBeDisabled()
  })

  it('caps the name where the API does', () => {
    renderWithLocale(<ClubPanel initial={null} />)

    expect(nameField()).toHaveAttribute('maxLength', '20')
  })

  it('speaks Spanish', () => {
    renderWithLocale(<ClubPanel initial={null} />, 'es')

    expect(screen.getByRole('heading', { name: CLUB_CONTENT.es.title })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: CLUB_CONTENT.es.full })).toBeInTheDocument()
  })
})
