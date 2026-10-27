import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
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

  const nameField = () => screen.getByLabelText(pt.clubNameLabel, { exact: false })
  const slotsField = () => screen.getByLabelText(pt.freeSlotsLabel, { exact: false })
  const fill = (name: string, slots: string) => {
    fireEvent.change(nameField(), { target: { value: name } })
    fireEvent.change(slotsField(), { target: { value: slots } })
  }

  it('declares a club, trimmed, and shows what the server kept', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      answer(200, { clubName: 'Clube Azul', freeSlots: 4, updatedAt: '2026-10-27T10:00:00Z' }),
    )
    renderWithLocale(<ClubPanel initial={null} />)

    expect(screen.queryByRole('button', { name: pt.remove })).toBeNull()
    fill('  Clube Azul  ', '4')
    fireEvent.click(screen.getByRole('button', { name: pt.save }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(pt.saved))
    expect(fetch).toHaveBeenCalledWith(
      '/bff/accounts/me/club',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ clubName: 'Clube Azul', freeSlots: 4 }),
      }),
    )
    expect(nameField()).toHaveValue('Clube Azul')
    expect(screen.getByRole('button', { name: pt.remove })).toBeInTheDocument()
  })

  it('says what is wrong when the API refuses the values, and keeps what was typed', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(answer(400))
    renderWithLocale(<ClubPanel initial={null} />)

    fill('Clube', '4')
    fireEvent.click(screen.getByRole('button', { name: pt.save }))

    expect(await screen.findByRole('alert')).toHaveTextContent(pt.invalid)
    expect(nameField()).toHaveValue('Clube')
    expect(slotsField()).toHaveValue(4)
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

    fill('Clube', '4')
    fireEvent.click(screen.getByRole('button', { name: pt.save }))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/login'))
  })

  it('shows the declared club, removes it and puts the keyboard back on the form', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(answer(204))
    renderWithLocale(<ClubPanel initial={{ clubName: 'Clube Azul', freeSlots: 3 }} />)

    expect(nameField()).toHaveValue('Clube Azul')
    expect(slotsField()).toHaveValue(3)
    fireEvent.click(screen.getByRole('button', { name: pt.remove }))

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(pt.removed))
    expect(fetch).toHaveBeenCalledWith('/bff/accounts/me/club', { method: 'DELETE' })
    expect(nameField()).toHaveValue('')
    expect(nameField()).toHaveFocus()
    expect(screen.queryByRole('button', { name: pt.remove })).toBeNull()
  })

  it('holds both buttons while a request is out', () => {
    vi.mocked(fetch).mockReturnValueOnce(new Promise(() => {}))
    renderWithLocale(<ClubPanel initial={{ clubName: 'Clube Azul', freeSlots: 3 }} />)

    fireEvent.click(screen.getByRole('button', { name: pt.save }))

    expect(screen.getByRole('button', { name: pt.saving })).toBeDisabled()
    expect(screen.getByRole('button', { name: pt.remove })).toBeDisabled()
  })

  it('caps the fields where the API does', () => {
    renderWithLocale(<ClubPanel initial={null} />)

    expect(nameField()).toHaveAttribute('maxLength', '20')
    expect(slotsField()).toHaveAttribute('min', '0')
    expect(slotsField()).toHaveAttribute('max', '10')
  })

  it('speaks Spanish', () => {
    renderWithLocale(<ClubPanel initial={null} />, 'es')

    expect(screen.getByRole('heading', { name: CLUB_CONTENT.es.title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: CLUB_CONTENT.es.save })).toBeInTheDocument()
  })
})
