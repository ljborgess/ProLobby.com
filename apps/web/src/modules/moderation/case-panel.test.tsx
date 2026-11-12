import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { MODERATION_PANEL_CONTENT } from '@/content/moderation-panel'
import { CasePanel } from './case-panel'
import { MAX_NOTE, type CasesSource } from './cases'
import { createSampleSource, sampleCases } from './sample-cases'

const pt = MODERATION_PANEL_CONTENT.pt
const es = MODERATION_PANEL_CONTENT.es

const NOW = Date.parse('2026-11-10T12:00:00Z')

const panel = (source: CasesSource = createSampleSource(sampleCases(NOW)), locale?: 'es') =>
  renderWithLocale(<CasePanel source={source} verifications={[]} archetypes={[]} />, locale)

const sidebar = () => screen.getByRole('navigation', { name: pt.sidebarLabel })
const section = async (name: string) =>
  fireEvent.click(await within(sidebar()).findByRole('button', { name: new RegExp(name) }))

/** #309: the panel by section, tried on made-up cases in the API's contract. */
describe('CasePanel', () => {
  it('lists the sections with their open counts, the total in "Todos"', async () => {
    panel()

    const all = await within(sidebar()).findByRole('button', { name: /Todos/ })
    await waitFor(() => expect(within(all).getByText(pt.openCount(9))).toBeInTheDocument())
    for (const [key, open] of [
      ['verifications', 2],
      ['reports', 3],
      ['matches', 1],
      ['appeals', 1],
      ['support', 1],
      ['system', 1],
    ] as const) {
      const button = within(sidebar()).getByRole('button', { name: new RegExp(pt.sections[key]) })
      expect(within(button).getByText(pt.openCount(open))).toBeInTheDocument()
    }
  })

  it('lists the cases oldest first and marks the overdue ones', async () => {
    panel()

    const list = await screen.findByRole('list', { name: pt.listLabel })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(9)
    // Opened 61 h ago, the oldest of the sample.
    expect(items[0]).toHaveTextContent(pt.caseTypes.user_report)
    expect(items[0]).toHaveTextContent(pt.overdue)
    expect(items[items.length - 1]).toHaveTextContent(pt.caseTypes.bot_delivery_failure)
    expect(items[items.length - 1]).not.toHaveTextContent(pt.overdue)
  })

  it('filters a section by type with chips', async () => {
    panel()
    await section('Denúncias')

    const group = await screen.findByRole('group', { name: pt.typeFilter })
    expect(within(group).getByRole('button', { name: pt.allTypes })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.click(
      within(group).getByRole('button', { name: new RegExp(pt.caseTypes.captain_abuse) }),
    )

    const list = await screen.findByRole('list', { name: pt.listLabel })
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(1))
    expect(list).toHaveTextContent(pt.caseTypes.captain_abuse)
  })

  it('drops a type filter once its last case is closed, instead of an empty list', async () => {
    panel()
    await section('Denúncias')
    const group = await screen.findByRole('group', { name: pt.typeFilter })
    fireEvent.click(
      within(group).getByRole('button', { name: new RegExp(pt.caseTypes.captain_abuse) }),
    )
    const list = await screen.findByRole('list', { name: pt.listLabel })
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(1))

    fireEvent.click(within(list).getByRole('button'))
    const detail = await screen.findByRole('article')
    fireEvent.click(within(detail).getByRole('button', { name: pt.close.outcomes.dismissed }))
    fireEvent.click(within(detail).getByRole('button', { name: pt.close.reasons.duplicate }))
    fireEvent.click(within(detail).getByRole('button', { name: pt.close.confirm }))

    // The captain_abuse chip is gone and the section lists its two user reports again.
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: new RegExp(pt.caseTypes.captain_abuse) }),
      ).toBeNull(),
    )
    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: pt.listLabel })).getAllByRole('listitem'),
      ).toHaveLength(2),
    )
  })

  it('shows the case, its people and the lobby, and never an e-mail or a birth date', async () => {
    panel()
    fireEvent.click(
      within(await screen.findByRole('list', { name: pt.listLabel })).getAllByRole('button')[0]!,
    )

    const detail = await screen.findByRole('article')
    expect(detail).toHaveTextContent(pt.caseTypes.user_report)
    expect(detail).toHaveTextContent('Saiu da chamada no meio do segundo tempo')
    expect(detail).toHaveTextContent(`${pt.reportReason}: ${pt.reportReasons.disconnect}`)
    expect(detail).toHaveTextContent(pt.roles.opened_by)
    expect(detail).toHaveTextContent(pt.roles.target)
    expect(detail).toHaveTextContent('Mirabel')
    expect(detail).toHaveTextContent(`${pt.reputation} 48`)
    expect(detail).toHaveTextContent(pt.history(1, 0, 2))
    expect(detail).toHaveTextContent('1 aberto, 0 procedentes, 2 improcedentes')
    expect(detail).toHaveTextContent(`${pt.origin}: ${pt.origins.user}`)
    expect(detail).toHaveTextContent('5b6d1f0a')
    expect(detail.textContent).not.toMatch(/@\w+\.\w+|nascimento|birth/i)
  })

  describe('closing a case', () => {
    const openFirst = async () => {
      fireEvent.click(
        within(await screen.findByRole('list', { name: pt.listLabel })).getAllByRole('button')[0]!,
      )
      return screen.findByRole('article')
    }

    it('offers the three reasons of a procedente and the four of an improcedente', async () => {
      panel()
      const detail = await openFirst()
      const reasons = () => within(detail).getByRole('group', { name: pt.close.reasonLabel })

      fireEvent.click(within(detail).getByRole('button', { name: pt.close.outcomes.resolved }))
      expect(
        within(reasons())
          .getAllByRole('button')
          .map((b) => b.textContent),
      ).toEqual([
        pt.close.reasons.confirmed,
        pt.close.reasons.handled_elsewhere,
        pt.close.reasons.settled_with_person,
      ])

      fireEvent.click(within(detail).getByRole('button', { name: pt.close.outcomes.dismissed }))
      expect(
        within(reasons())
          .getAllByRole('button')
          .map((b) => b.textContent),
      ).toEqual([
        pt.close.reasons.no_evidence,
        pt.close.reasons.duplicate,
        pt.close.reasons.within_rules,
        pt.close.reasons.already_resolved,
      ])
    })

    it('asks for no confirm until a reason is picked', async () => {
      panel()
      const detail = await openFirst()

      expect(within(detail).queryByRole('button', { name: pt.close.confirm })).toBeNull()
      fireEvent.click(within(detail).getByRole('button', { name: pt.close.outcomes.dismissed }))
      expect(within(detail).queryByRole('button', { name: pt.close.confirm })).toBeNull()
      fireEvent.click(within(detail).getByRole('button', { name: pt.close.reasons.no_evidence }))
      expect(within(detail).getByRole('button', { name: pt.close.confirm })).toBeInTheDocument()
    })

    it('closes with the outcome, the reason and the note, then opens the next case', async () => {
      const source = createSampleSource(sampleCases(NOW))
      const close = vi.spyOn(source, 'close')
      panel(source)
      const detail = await openFirst()
      const firstId = sampleCases(NOW).find((c) => c.type === 'user_report')!.id

      fireEvent.click(within(detail).getByRole('button', { name: pt.close.outcomes.resolved }))
      fireEvent.click(within(detail).getByRole('button', { name: pt.close.reasons.confirmed }))
      fireEvent.change(within(detail).getByRole('textbox'), {
        target: { value: '  Conferi o print.  ' },
      })
      fireEvent.click(within(detail).getByRole('button', { name: pt.close.confirm }))

      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(pt.close.done))
      expect(close).toHaveBeenCalledWith(firstId, {
        outcome: 'resolved',
        reason: 'confirmed',
        note: 'Conferi o print.',
      })
      // The closed one left the list and the counters, and the next case is open.
      const list = screen.getByRole('list', { name: pt.listLabel })
      expect(within(list).getAllByRole('listitem')).toHaveLength(8)
      await waitFor(() =>
        expect(screen.getByRole('article')).toHaveTextContent(
          'Os dois lados enviaram placares diferentes',
        ),
      )
      const all = within(sidebar()).getByRole('button', { name: /Todos/ })
      await waitFor(() => expect(within(all).getByText(pt.openCount(8))).toBeInTheDocument())
    })

    it('limits the note to 500 characters and counts what is left', async () => {
      panel()
      const detail = await openFirst()
      fireEvent.click(within(detail).getByRole('button', { name: pt.close.outcomes.dismissed }))
      fireEvent.click(within(detail).getByRole('button', { name: pt.close.reasons.duplicate }))

      const note = within(detail).getByRole('textbox')
      expect(note).toHaveAttribute('maxlength', String(MAX_NOTE))
      fireEvent.change(note, { target: { value: 'a'.repeat(120) } })
      expect(detail).toHaveTextContent(pt.close.noteHint(380))
    })

    it('says so when someone else closed the case first, and reloads the queue', async () => {
      const source = createSampleSource(sampleCases(NOW))
      source.close = async () => 'already_closed'
      panel(source)
      const detail = await openFirst()

      fireEvent.click(within(detail).getByRole('button', { name: pt.close.outcomes.dismissed }))
      fireEvent.click(within(detail).getByRole('button', { name: pt.close.reasons.no_evidence }))
      fireEvent.click(within(detail).getByRole('button', { name: pt.close.confirm }))

      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent(pt.close.alreadyClosed),
      )
    })

    it('keeps the form and says it failed when the API errors', async () => {
      const source = createSampleSource(sampleCases(NOW))
      source.close = async () => 'failed'
      panel(source)
      const detail = await openFirst()

      fireEvent.click(within(detail).getByRole('button', { name: pt.close.outcomes.dismissed }))
      fireEvent.click(within(detail).getByRole('button', { name: pt.close.reasons.no_evidence }))
      fireEvent.click(within(detail).getByRole('button', { name: pt.close.confirm }))

      await waitFor(() => expect(screen.getByText(pt.close.failed)).toBeInTheDocument())
      expect(within(detail).getByRole('button', { name: pt.close.confirm })).toBeEnabled()
    })
  })

  it('shows the character prints screen under the Personagem filter of Verificações', async () => {
    const source = createSampleSource(sampleCases(NOW))
    const summary = await source.summary()
    source.summary = async () =>
      summary.map((item) =>
        item.key === 'verifications'
          ? { ...item, types: [{ type: 'character_verification', open: 1 }, ...item.types] }
          : item,
      )
    renderWithLocale(
      <CasePanel
        source={source}
        verifications={[{ caseId: 'c1', category: 'midfielder', platform: 'ps5' }]}
        archetypes={['MAESTRO']}
      />,
    )
    await section('Verificações')

    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(pt.caseTypes.character_verification) }),
    )

    expect(await screen.findByRole('button', { name: /aprovar/i })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: pt.listLabel })).toBeNull()
  })

  it('recovers when closing a case fails on the network, instead of hanging on "Encerrando…"', async () => {
    const source = createSampleSource(sampleCases(NOW))
    source.close = () => Promise.reject(new Error('offline'))
    panel(source)
    fireEvent.click(
      within(await screen.findByRole('list', { name: pt.listLabel })).getAllByRole('button')[0]!,
    )
    const detail = await screen.findByRole('article')

    fireEvent.click(within(detail).getByRole('button', { name: pt.close.outcomes.dismissed }))
    fireEvent.click(within(detail).getByRole('button', { name: pt.close.reasons.no_evidence }))
    fireEvent.click(within(detail).getByRole('button', { name: pt.close.confirm }))

    await waitFor(() => expect(screen.getByText(pt.close.failed)).toBeInTheDocument())
    expect(within(detail).getByRole('button', { name: pt.close.confirm })).toBeEnabled()
  })

  it('shows when the counters did not load, and tries again', async () => {
    const source = createSampleSource(sampleCases(NOW))
    const summary = vi.spyOn(source, 'summary')
    summary.mockRejectedValueOnce(new Error('down'))
    panel(source)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(pt.loadError)
    fireEvent.click(within(alert).getByRole('button', { name: pt.retry }))

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    const all = await within(sidebar()).findByRole('button', { name: /Todos/ })
    await waitFor(() => expect(within(all).getByText(pt.openCount(9))).toBeInTheDocument())
  })

  it('treats a case that is gone (closed by someone else) like a 409', async () => {
    const source = createSampleSource(sampleCases(NOW))
    source.detail = async () => null
    panel(source)

    fireEvent.click(
      within(await screen.findByRole('list', { name: pt.listLabel })).getAllByRole('button')[0]!,
    )

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(pt.close.alreadyClosed),
    )
  })

  it('keeps the newest counters when an older summary answers late', async () => {
    const source = createSampleSource(sampleCases(NOW))
    const real = source.summary.bind(source)
    let release: (() => void) | null = null
    const slow = new Promise<void>((resolve) => (release = resolve))
    const summary = vi.spyOn(source, 'summary')
    // The first call (on mount) is slow and stale; the second (after a close) is quick.
    summary.mockImplementationOnce(async () => {
      const stale = await real()
      await slow
      return stale.map((item) => ({ ...item, open: 99 }))
    })
    panel(source)
    const detail = await (async () => {
      fireEvent.click(
        within(await screen.findByRole('list', { name: pt.listLabel })).getAllByRole('button')[0]!,
      )
      return screen.findByRole('article')
    })()
    fireEvent.click(within(detail).getByRole('button', { name: pt.close.outcomes.dismissed }))
    fireEvent.click(within(detail).getByRole('button', { name: pt.close.reasons.duplicate }))
    fireEvent.click(within(detail).getByRole('button', { name: pt.close.confirm }))
    const all = await within(sidebar()).findByRole('button', { name: /Todos/ })
    await waitFor(() => expect(within(all).getByText(pt.openCount(8))).toBeInTheDocument())

    release!()
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(within(all).getByText(pt.openCount(8))).toBeInTheDocument()
  })

  it('does not load a case list while the prints queue is open', async () => {
    const source = createSampleSource(sampleCases(NOW), { prints: 1 })
    const list = vi.spyOn(source, 'list')
    renderWithLocale(
      <CasePanel
        source={source}
        verifications={[{ caseId: 'c1', category: 'midfielder', platform: 'ps5' }]}
        archetypes={['MAESTRO']}
      />,
    )
    await section('Verificações')
    await waitFor(() => expect(list).toHaveBeenCalledWith('verifications', null))
    list.mockClear()

    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(pt.caseTypes.character_verification) }),
    )

    expect(await screen.findByRole('button', { name: /aprovar/i })).toBeInTheDocument()
    expect(list).not.toHaveBeenCalled()
  })

  it('reads in Spanish', async () => {
    panel(undefined, 'es')

    expect(await screen.findByRole('navigation', { name: es.sidebarLabel })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: new RegExp(es.sections.matches) }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: es.listLabel })).toBeInTheDocument()
  })

  it('offers a retry when the list does not load', async () => {
    const source = createSampleSource(sampleCases(NOW))
    const list = vi.spyOn(source, 'list')
    list.mockRejectedValueOnce(new Error('down'))
    panel(source)

    fireEvent.click(await screen.findByRole('button', { name: pt.retry }))

    expect(await screen.findByRole('list', { name: pt.listLabel })).toBeInTheDocument()
  })
})
