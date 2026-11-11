import { describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithLocale } from '@/test-utils'
import { MODERATION_TOOLS_CONTENT } from '@/content/moderation-tools'
import { CasePanel } from './case-panel'
import { createSampleSource, sampleCases } from './sample-cases'
import { createSampleTools, sampleAudit, samplePlayers } from './sample-tools'
import { AUDIT_PAGE_SIZE, type ToolsSource } from './tools'

const pt = MODERATION_TOOLS_CONTENT.pt
const es = MODERATION_TOOLS_CONTENT.es
const NOW = Date.parse('2026-11-10T12:00:00Z')

const panel = ({ admin, tools }: { admin: boolean; tools?: ToolsSource }, locale?: 'es') =>
  renderWithLocale(
    <CasePanel
      source={createSampleSource(sampleCases(NOW))}
      tools={tools ?? createSampleTools({ admin }, samplePlayers(NOW), sampleAudit(NOW))}
      isAdmin={admin}
      verifications={[]}
      archetypes={[]}
    />,
    locale,
  )

const nav = () => screen.getByRole('navigation')
const open = async (name: string) =>
  fireEvent.click(await within(nav()).findByRole('button', { name }))

const search = async (term: string) => {
  fireEvent.change(await screen.findByLabelText(new RegExp(pt.players.searchLabel)), {
    target: { value: term },
  })
  fireEvent.click(screen.getByRole('button', { name: pt.players.search }))
}

/** #314: the management sections, tried on made-up data in the API's contract. */
describe('management sections', () => {
  it('lists Jogadores, Auditoria and Métricas, and Planos only for an admin', async () => {
    const moderator = panel({ admin: false })
    expect(await within(nav()).findByRole('button', { name: pt.nav.players })).toBeInTheDocument()
    expect(within(nav()).getByRole('button', { name: pt.nav.audit })).toBeInTheDocument()
    expect(within(nav()).getByRole('button', { name: pt.nav.metrics })).toBeInTheDocument()
    expect(within(nav()).queryByRole('button', { name: pt.nav.plans })).toBeNull()
    moderator.unmount()

    panel({ admin: true })
    expect(await within(nav()).findByRole('button', { name: pt.nav.plans })).toBeInTheDocument()
  })

  describe('Jogadores', () => {
    it('asks for a search first, then finds by gamertag or by Discord mention', async () => {
      panel({ admin: false })
      await open(pt.nav.players)
      expect(screen.getByText(pt.players.prompt)).toBeInTheDocument()

      await search('mira')
      const results = await screen.findByRole('list', { name: pt.players.results })
      expect(within(results).getAllByRole('listitem')).toHaveLength(1)
      expect(results).toHaveTextContent('Mirabel')

      await search('<@200000000000000004>')
      await waitFor(() =>
        expect(screen.getByRole('list', { name: pt.players.results })).toHaveTextContent('Ravenna'),
      )
    })

    it('says when nobody is found', async () => {
      panel({ admin: false })
      await open(pt.nav.players)

      await search('zzzz')

      expect(await screen.findByText(pt.players.noResults)).toBeInTheDocument()
    })

    it('shows the sheet read only: characters, reputation, cases, punishments, Discord', async () => {
      panel({ admin: false })
      await open(pt.nav.players)
      await search('mirabel')
      fireEvent.click(
        within(await screen.findByRole('list', { name: pt.players.results })).getByRole('button'),
      )

      const sheet = await screen.findByRole('article', { name: pt.players.sheet })
      expect(sheet).toHaveTextContent('Mirabel')
      expect(sheet).toHaveTextContent(`${pt.players.reputation} 48`)
      expect(sheet).toHaveTextContent(pt.caseStates.open)
      expect(sheet).toHaveTextContent(pt.caseStates.resolved)
      expect(sheet).toHaveTextContent(pt.players.punishmentKinds.suspension!)
      expect(sheet).toHaveTextContent('<@200000000000000002>')
      // Read only, and never an e-mail or a birth date.
      expect(within(sheet).queryByRole('button')).toBeNull()
      expect(sheet.textContent).not.toMatch(/@\w+\.\w+|nascimento|birth/i)
    })

    it('marks a punishment with no end as in force', async () => {
      panel({ admin: false })
      await open(pt.nav.players)
      await search('kestrel')
      fireEvent.click(
        within(await screen.findByRole('list', { name: pt.players.results })).getByRole('button'),
      )

      expect(await screen.findByRole('article', { name: pt.players.sheet })).toHaveTextContent(
        pt.players.ongoing,
      )
    })
  })

  describe('Auditoria', () => {
    it('is a read-only table, newest first, with no way to edit or delete an entry', async () => {
      panel({ admin: false })
      await open(pt.nav.audit)

      const table = await screen.findByRole('table')
      const rows = within(table).getAllByRole('row').slice(1)
      expect(rows).toHaveLength(AUDIT_PAGE_SIZE)
      expect(screen.getByText(pt.audit.readOnly)).toBeInTheDocument()
      expect(within(table).queryByRole('button')).toBeNull()
      expect(
        screen.queryByRole('button', { name: /editar|apagar|excluir|delete|edit/i }),
      ).toBeNull()
    })

    it('filters by action, by moderator and by affected account', async () => {
      panel({ admin: false })
      await open(pt.nav.audit)
      await screen.findByRole('table')

      fireEvent.change(screen.getByLabelText(pt.audit.action), {
        target: { value: 'plan_changed' },
      })
      fireEvent.click(screen.getByRole('button', { name: pt.audit.filter }))
      await waitFor(() => {
        const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
        expect(rows.length).toBeGreaterThan(0)
        for (const row of rows) expect(row).toHaveTextContent(pt.audit.actions.plan_changed!)
      })

      fireEvent.change(screen.getByLabelText(pt.audit.action), { target: { value: '' } })
      fireEvent.change(screen.getByLabelText(pt.audit.actor), { target: { value: 'rafael' } })
      fireEvent.click(screen.getByRole('button', { name: pt.audit.filter }))
      await waitFor(() => {
        const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
        expect(rows.length).toBeGreaterThan(0)
        for (const row of rows) expect(row).toHaveTextContent('Rafael')
      })

      fireEvent.change(screen.getByLabelText(pt.audit.actor), { target: { value: '' } })
      fireEvent.change(screen.getByLabelText(pt.audit.account), { target: { value: 'zzzz' } })
      fireEvent.click(screen.getByRole('button', { name: pt.audit.filter }))
      expect(await screen.findByText(pt.audit.empty)).toBeInTheDocument()
    })

    it('loads older entries with "Carregar mais" until there are no more', async () => {
      panel({ admin: false })
      await open(pt.nav.audit)
      await screen.findByRole('table')

      fireEvent.click(screen.getByRole('button', { name: pt.audit.loadMore }))
      await waitFor(() =>
        expect(within(screen.getByRole('table')).getAllByRole('row').slice(1)).toHaveLength(
          AUDIT_PAGE_SIZE * 2,
        ),
      )
      fireEvent.click(screen.getByRole('button', { name: pt.audit.loadMore }))
      await waitFor(() =>
        expect(within(screen.getByRole('table')).getAllByRole('row').slice(1)).toHaveLength(27),
      )
      expect(screen.queryByRole('button', { name: pt.audit.loadMore })).toBeNull()
    })
  })

  describe('Métricas', () => {
    it('shows six exit criteria and three success metrics, with a check when met', async () => {
      panel({ admin: false })
      await open(pt.nav.metrics)

      const beta = await screen.findByRole('region', { name: pt.metrics.beta })
      expect(within(beta).getAllByRole('listitem')).toHaveLength(6)
      expect(within(beta).getAllByRole('img', { name: pt.metrics.met })).toHaveLength(3)
      const success = screen.getByRole('region', { name: pt.metrics.success })
      expect(within(success).getAllByRole('listitem')).toHaveLength(3)
      expect(success).toHaveTextContent(pt.metrics.bands.worked)
      expect(success).toHaveTextContent(pt.metrics.bands.ambiguous)
    })

    it('says "sem dado ainda" for a value nobody measured, never a 0', async () => {
      panel({ admin: false })
      await open(pt.nav.metrics)

      const beta = await screen.findByRole('region', { name: pt.metrics.beta })
      expect(within(beta).getAllByText(pt.noData)).toHaveLength(1)
      expect(
        within(screen.getByRole('region', { name: pt.metrics.success })).getAllByText(pt.noData),
      ).toHaveLength(1)
    })
  })

  describe('Planos', () => {
    const openPlayer = async () => {
      await open(pt.nav.plans)
      await search('borges')
      fireEvent.click(
        within(await screen.findByRole('list', { name: pt.players.results })).getByRole('button'),
      )
      return screen.findByRole('article', { name: pt.players.sheet })
    }

    it('keeps the plan form off the read-only player sheet', async () => {
      panel({ admin: true })
      await open(pt.nav.players)
      await search('borges')
      fireEvent.click(
        within(await screen.findByRole('list', { name: pt.players.results })).getByRole('button'),
      )

      const sheet = await screen.findByRole('article', { name: pt.players.sheet })
      expect(within(sheet).queryByRole('region', { name: pt.plan.heading })).toBeNull()
    })

    it('asks for the PIX reference before any plan is activated', async () => {
      panel({ admin: true })
      const sheet = await openPlayer()

      fireEvent.click(within(sheet).getByRole('button', { name: pt.plan.activate.founder }))

      expect(within(sheet).getByRole('alert')).toHaveTextContent(pt.plan.pixRequired)
      expect(within(sheet).queryByRole('alertdialog')).toBeNull()
    })

    it('asks for a confirmation, and changes nothing until it is given', async () => {
      const tools = createSampleTools({ admin: true }, samplePlayers(NOW), sampleAudit(NOW))
      const before = await tools.searchPlayers('borges')
      panel({ admin: true, tools })
      const sheet = await openPlayer()

      fireEvent.change(within(sheet).getByLabelText(new RegExp(pt.plan.pix)), {
        target: { value: 'E2026PIX' },
      })
      fireEvent.click(within(sheet).getByRole('button', { name: pt.plan.activate.supporter }))

      const dialog = within(sheet).getByRole('alertdialog')
      expect(dialog).toHaveTextContent(pt.plan.confirmActivate(pt.plans.supporter, 'borges_fc'))
      expect((await tools.searchPlayers('borges'))[0]!.plan).toBe(before[0]!.plan)

      fireEvent.click(within(dialog).getByRole('button', { name: pt.plan.cancel }))
      expect(within(sheet).queryByRole('alertdialog')).toBeNull()
      expect((await tools.searchPlayers('borges'))[0]!.plan).toBe('founder')

      fireEvent.click(within(sheet).getByRole('button', { name: pt.plan.activate.supporter }))
      fireEvent.click(
        within(within(sheet).getByRole('alertdialog')).getByRole('button', {
          name: pt.plan.confirm,
        }),
      )
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(pt.plan.done))
      expect((await tools.searchPlayers('borges'))[0]!.plan).toBe('supporter')
      expect(sheet).toHaveTextContent(`${pt.plan.current}: ${pt.plans.supporter}`)
    })

    it('revokes a plan after a confirmation, without asking for the PIX', async () => {
      panel({ admin: true })
      const sheet = await openPlayer()

      fireEvent.click(within(sheet).getByRole('button', { name: pt.plan.revoke }))
      expect(within(sheet).getByRole('alertdialog')).toHaveTextContent(
        pt.plan.confirmRevoke('borges_fc'),
      )
      fireEvent.click(
        within(within(sheet).getByRole('alertdialog')).getByRole('button', {
          name: pt.plan.confirm,
        }),
      )

      await waitFor(() => expect(sheet).toHaveTextContent(`${pt.plan.current}: ${pt.plans.none}`))
    })

    it('says so when the API refuses a non-admin with 403', async () => {
      const tools = createSampleTools({ admin: false }, samplePlayers(NOW), sampleAudit(NOW))
      panel({ admin: true, tools })
      const sheet = await openPlayer()

      fireEvent.change(within(sheet).getByLabelText(new RegExp(pt.plan.pix)), {
        target: { value: 'E2026PIX' },
      })
      fireEvent.click(within(sheet).getByRole('button', { name: pt.plan.activate.founder }))
      fireEvent.click(
        within(within(sheet).getByRole('alertdialog')).getByRole('button', {
          name: pt.plan.confirm,
        }),
      )

      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(pt.plan.forbidden))
      expect(sheet).toHaveTextContent(`${pt.plan.current}: ${pt.plans.founder}`)
    })
  })

  it('reads in Spanish', async () => {
    panel({ admin: true }, 'es')

    expect(await within(nav()).findByRole('button', { name: es.nav.players })).toBeInTheDocument()
    expect(within(nav()).getByRole('button', { name: es.nav.plans })).toBeInTheDocument()
    fireEvent.click(within(nav()).getByRole('button', { name: es.nav.metrics }))
    expect(await screen.findByRole('region', { name: es.metrics.beta })).toBeInTheDocument()
  })
})
