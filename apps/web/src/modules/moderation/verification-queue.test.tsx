import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { CHARACTER_CONTENT } from '@/content/character'
import { MODERATION_CONTENT } from '@/content/moderation'
import { CharacterFlow } from '@/modules/character/character-flow'
import { VerificationQueue, type VerificationCase } from './verification-queue'

const pt = MODERATION_CONTENT.pt
const character = CHARACTER_CONTENT.pt

const CASE: VerificationCase = {
  caseId: '22222222-2222-2222-2222-222222222222',
  category: 'midfielder',
  declaredArchetype: 'maestro',
  platform: 'ps5',
  declaredGamertag: 'Torvalen',
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('VerificationQueue', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('says when nothing is waiting', () => {
    renderWithLocale(<VerificationQueue cases={[]} archetypes={['maestro']} />)

    expect(screen.getByText(pt.empty)).toBeInTheDocument()
  })

  it('shows the print and never the declared tag as a hint to copy', () => {
    renderWithLocale(<VerificationQueue cases={[CASE]} archetypes={['maestro', 'creator']} />)

    expect(screen.getByRole('img', { name: pt.printAlt })).toHaveAttribute(
      'src',
      `/bff/moderation/character-verifications/${CASE.caseId}/print`,
    )
    expect(screen.queryByText(/Torvalen/)).toBeNull()
  })

  it('sends what the moderator typed and shows the outcome', async () => {
    vi.mocked(fetch).mockResolvedValue(json(201, { approved: true, rejection: null }))
    renderWithLocale(<VerificationQueue cases={[CASE]} archetypes={['maestro', 'creator']} />)

    fireEvent.change(screen.getByLabelText(pt.typedArchetype), { target: { value: 'creator' } })
    fireEvent.change(screen.getByLabelText(pt.typedGamertag), { target: { value: 'Torvalen' } })
    fireEvent.click(screen.getByRole('button', { name: pt.approve }))

    expect(await screen.findByRole('status')).toHaveTextContent(pt.approved)
    const [, init] = vi.mocked(fetch).mock.calls[0]!
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      approve: true,
      archetype: 'creator',
      gamertag: 'Torvalen',
    })
  })

  it('shows the cause when the server turns an approval into a rejection', async () => {
    vi.mocked(fetch).mockResolvedValue(
      json(201, { approved: false, rejection: 'gamertag_mismatch' }),
    )
    renderWithLocale(<VerificationQueue cases={[CASE]} archetypes={['maestro']} />)

    fireEvent.change(screen.getByLabelText(pt.typedArchetype), { target: { value: 'maestro' } })
    fireEvent.change(screen.getByLabelText(pt.typedGamertag), { target: { value: 'Someone' } })
    fireEvent.click(screen.getByRole('button', { name: pt.approve }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      character.print.rejections.gamertag_mismatch,
    )
  })

  it('rejects with the cause picked by eye', async () => {
    vi.mocked(fetch).mockResolvedValue(json(201, { approved: false, rejection: 'unreadable' }))
    renderWithLocale(<VerificationQueue cases={[CASE]} archetypes={['maestro']} />)

    fireEvent.change(screen.getByLabelText(pt.rejectionLabel), { target: { value: 'unreadable' } })
    fireEvent.click(screen.getByRole('button', { name: pt.reject }))

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const [, init] = vi.mocked(fetch).mock.calls[0]!
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      approve: false,
      rejection: 'unreadable',
    })
  })
})

describe('CharacterFlow statuses', () => {
  const base = {
    id: '33333333-3333-3333-3333-333333333333',
    category: 'midfielder' as const,
    archetype: 'maestro',
    platform: 'ps5' as const,
    state: 'pending_verification' as const,
  }

  it('hides the send button while a print is under review', () => {
    renderWithLocale(
      <CharacterFlow
        characters={[{ ...base, lastPrint: { status: 'received', rejection: null } }]}
        archetypes={[]}
      />,
    )

    expect(screen.getByText(character.existing.inReview)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: character.existing.sendPrint })).toBeNull()
  })

  it('shows why a print was rejected and offers to send again', () => {
    renderWithLocale(
      <CharacterFlow
        characters={[{ ...base, lastPrint: { status: 'rejected', rejection: 'unreadable' } }]}
        archetypes={[]}
      />,
    )

    expect(screen.getByText(new RegExp(character.print.rejections.unreadable))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: character.existing.sendAgain })).toBeInTheDocument()
  })
})
