'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useLocale } from '@/common/providers/locale-provider'
import { useModerationToolsContent } from '@/hooks/use-moderation-tools-content'
import { CHIP, CHIP_OFF, FIELD, formatDate } from './panel-styles'
import type { AuditEntry, AuditFilters, ToolsSource } from './tools'

const NO_FILTERS: AuditFilters = { actor: '', action: '', account: '' }
const KNOWN_ACTIONS = ['role_changed', 'case_resolved', 'plan_changed'] as const

type Page = { entries: AuditEntry[]; next: string | null }
type State =
  { status: 'loading' } | { status: 'error' } | ({ status: 'ready'; loadingMore: boolean } & Page)

/**
 * The audit trail (#314): a table, newest first, read only — there is no
 * button that edits or deletes an entry, on purpose (the database refuses it
 * too). Filtered by moderator, action and affected account; older entries come
 * with "Carregar mais".
 */
export function AuditView({ source }: { source: ToolsSource }) {
  const content = useModerationToolsContent()
  const { locale } = useLocale()
  const [draft, setDraft] = useState<AuditFilters>(NO_FILTERS)
  const [applied, setApplied] = useState<AuditFilters>(NO_FILTERS)
  const [state, setState] = useState<State>({ status: 'loading' })
  const [version, setVersion] = useState(0)
  const key = `${applied.actor}|${applied.action}|${applied.account}|${version}`
  const [loadedKey, setLoadedKey] = useState('')

  useEffect(() => {
    let alive = true
    source
      .audit(applied, null)
      .then((page) => {
        if (!alive) return
        setState({ status: 'ready', loadingMore: false, ...page })
        setLoadedKey(key)
      })
      .catch(() => {
        if (!alive) return
        setState({ status: 'error' })
        setLoadedKey(key)
      })
    return () => {
      alive = false
    }
  }, [source, applied, key])

  const current: State = loadedKey === key ? state : { status: 'loading' }

  function filter(event: FormEvent) {
    event.preventDefault()
    setApplied({ ...draft })
  }

  async function loadMore() {
    if (current.status !== 'ready' || !current.next || current.loadingMore) return
    const before = current.next
    setState({ ...current, loadingMore: true })
    try {
      const page = await source.audit(applied, before)
      setState((now) =>
        now.status === 'ready'
          ? {
              ...now,
              loadingMore: false,
              entries: [...now.entries, ...page.entries],
              next: page.next,
            }
          : now,
      )
    } catch {
      setState((now) => (now.status === 'ready' ? { ...now, loadingMore: false } : now))
    }
  }

  const actionLabel = (action: string) =>
    (content.audit.actions as Record<string, string>)[action] ?? action

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground-soft">{content.audit.readOnly}</p>

      <form onSubmit={filter} className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-foreground">
          {content.audit.actor}
          <input
            value={draft.actor}
            onChange={(event) => setDraft({ ...draft, actor: event.target.value })}
            className={FIELD}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-foreground">
          {content.audit.action}
          <select
            value={draft.action}
            onChange={(event) => setDraft({ ...draft, action: event.target.value })}
            className={FIELD}
          >
            <option value="">{content.audit.allActions}</option>
            {KNOWN_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {actionLabel(action)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-foreground">
          {content.audit.account}
          <input
            value={draft.account}
            onChange={(event) => setDraft({ ...draft, account: event.target.value })}
            className={FIELD}
          />
        </label>
        <button
          type="submit"
          className="landing-focus min-h-11 self-start rounded-full bg-accent px-5 text-sm font-medium text-background sm:col-span-3"
        >
          {content.audit.filter}
        </button>
      </form>

      {current.status === 'loading' && <p className="text-sm text-foreground-soft">…</p>}
      {current.status === 'error' && (
        <div className="flex flex-col items-start gap-2 text-sm">
          <p className="text-foreground-soft">{content.loadError}</p>
          <button
            type="button"
            onClick={() => setVersion((n) => n + 1)}
            className={`${CHIP} ${CHIP_OFF}`}
          >
            {content.retry}
          </button>
        </div>
      )}
      {current.status === 'ready' && current.entries.length === 0 && (
        <p className="text-sm text-foreground-soft">{content.audit.empty}</p>
      )}
      {current.status === 'ready' && current.entries.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-md border border-white/10">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-xs text-foreground-soft">
                <tr>
                  {[
                    content.audit.when,
                    content.audit.action,
                    content.audit.who,
                    content.audit.target,
                    content.audit.caseColumn,
                    content.audit.before,
                    content.audit.after,
                  ].map((heading) => (
                    <th key={heading} scope="col" className="px-3 py-2 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {current.entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-white/10 text-foreground">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDate(entry.createdAt, locale)}
                    </td>
                    <td className="px-3 py-2">{actionLabel(entry.action)}</td>
                    <td className="px-3 py-2">{entry.actorLabel || content.audit.system}</td>
                    <td className="px-3 py-2">
                      <code>{entry.targetAccountId?.slice(-8) ?? '—'}</code>
                    </td>
                    <td className="px-3 py-2">
                      <code>{entry.caseId?.slice(-8) ?? '—'}</code>
                    </td>
                    <td className="px-3 py-2 text-foreground-soft">{entry.before ?? '—'}</td>
                    <td className="px-3 py-2 text-foreground-soft">{entry.after ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {current.next && (
            <button
              type="button"
              onClick={loadMore}
              disabled={current.loadingMore}
              className={`${CHIP} ${CHIP_OFF} self-start`}
            >
              {current.loadingMore ? content.audit.loading : content.audit.loadMore}
            </button>
          )}
        </>
      )}
    </div>
  )
}
