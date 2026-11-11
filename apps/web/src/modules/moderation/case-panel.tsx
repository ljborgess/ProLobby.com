'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useLocale } from '@/common/providers/locale-provider'
import { CHARACTER_CONTENT } from '@/content/character'
import { useModerationPanelContent } from '@/hooks/use-moderation-panel-content'
import { useModerationToolsContent } from '@/hooks/use-moderation-tools-content'
import {
  MAX_NOTE,
  REASONS_OF,
  SECTION_KEYS,
  type CaseDetail,
  type CaseListItem,
  type CaseType,
  type CasesSource,
  type Outcome,
  type ClosureReason,
  type SectionKey,
  type SectionSummary,
} from './cases'
import { CHIP, CHIP_OFF, CHIP_ON, formatDate } from './panel-styles'
import { AuditView } from './audit-view'
import { MetricsView } from './metrics-view'
import { PlayersView } from './players-view'
import type { ToolsSource } from './tools'
import { VerificationQueue, type VerificationCase } from './verification-queue'

type Selected = SectionKey | 'all'
type ToolKey = 'players' | 'audit' | 'metrics' | 'plans'
type Loaded<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; value: T }

/**
 * The moderation panel by section (#306, #309): a sidebar with the open count
 * of each section, a type filter inside it, the cases oldest first, one case's
 * detail, and the closing in four clicks — outcome, reason, an optional note,
 * confirm — after which the next case of the section opens by itself.
 *
 * Character prints keep their own screen (#198): the Personagem filter of
 * Verificações shows it, because approving one means typing what the print
 * shows, not picking a reason.
 */
export function CasePanel({
  source,
  verifications,
  archetypes,
  tools,
  isAdmin,
  sample = false,
}: {
  source: CasesSource
  /** The management sections' data: players, audit, metrics and plans (#314). */
  tools: ToolsSource
  /** Whether this session is an admin: only then is Planos offered. */
  isAdmin: boolean
  verifications: VerificationCase[]
  archetypes: string[]
  /** The source holds made-up cases (the API is not on yet): say so on the screen. */
  sample?: boolean
}) {
  const content = useModerationPanelContent()
  const toolsContent = useModerationToolsContent()
  const [tool, setTool] = useState<ToolKey | null>(null)
  const [summary, setSummary] = useState<Loaded<SectionSummary[]>>({ status: 'loading' })
  const [section, setSection] = useState<Selected>('all')
  const [type, setType] = useState<CaseType | null>(null)
  const [reload, setReload] = useState(0)
  const [listed, setListed] = useState<{ key: string; result: Loaded<CaseListItem[]> }>({
    key: '',
    result: { status: 'loading' },
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  // A late answer must not write into a panel that is gone.
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const loadSummary = useCallback(() => {
    source
      .summary()
      .then((value) => mounted.current && setSummary({ status: 'ready', value }))
      .catch(() => mounted.current && setSummary({ status: 'error' }))
  }, [source])

  useEffect(loadSummary, [loadSummary])

  const sections = summary.status === 'ready' ? summary.value : []
  const countOf = (key: Selected) =>
    key === 'all'
      ? sections.reduce((sum, item) => sum + item.open, 0)
      : (sections.find((item) => item.key === key)?.open ?? 0)
  const chips =
    section === 'all' ? [] : (sections.find((item) => item.key === section)?.types ?? [])
  // A filter whose last case was just closed has no chip left: it reads as
  // "all types" instead of an empty list under a filter nobody can see.
  const activeType = chips.some((chip) => chip.type === type) ? type : null
  const showingPrints = section === 'verifications' && activeType === 'character_verification'

  // What is on screen belongs to one filter and one reload: any other key
  // reads as "loading" without a state write inside the effect.
  const listKey = `${section}|${activeType ?? ''}|${reload}`
  useEffect(() => {
    let alive = true
    source
      .list(section === 'all' ? null : section, activeType)
      .then(
        (value) =>
          alive &&
          setListed({
            key: listKey,
            result: {
              status: 'ready',
              value: value.filter((item) => item.type !== 'character_verification'),
            },
          }),
      )
      .catch(() => alive && setListed({ key: listKey, result: { status: 'error' } }))
    return () => {
      alive = false
    }
  }, [source, section, activeType, listKey])
  const list: Loaded<CaseListItem[]> =
    listed.key === listKey ? listed.result : { status: 'loading' }
  const loadList = () => setReload((n) => n + 1)

  const pick = (next: Selected) => {
    setTool(null)
    setSection(next)
    setType(null)
    setSelectedId(null)
    setNotice('')
  }

  const closed = (id: string) => {
    setNotice(content.close.done)
    if (list.status === 'ready') {
      const index = list.value.findIndex((item) => item.id === id)
      const rest = list.value.filter((item) => item.id !== id)
      setListed({ key: listKey, result: { status: 'ready', value: rest } })
      setSelectedId(rest[Math.min(index, rest.length - 1)]?.id ?? null)
    }
    loadSummary()
  }

  const staleClosed = () => {
    loadList()
    loadSummary()
    setSelectedId(null)
    setNotice(content.close.alreadyClosed)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="landing-section-title font-display text-foreground">{content.title}</h1>
      {sample && (
        <p className="rounded-md border border-white/15 px-3.5 py-2 text-sm text-foreground-soft">
          {content.sample}
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label={content.sidebarLabel}>
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {(['all', ...SECTION_KEYS] as Selected[]).map((key) => (
              <li key={key} className="shrink-0">
                <button
                  type="button"
                  onClick={() => pick(key)}
                  aria-current={tool === null && section === key ? 'page' : undefined}
                  className={`landing-focus flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-3.5 text-sm transition-colors ${
                    tool === null && section === key ? CHIP_ON : CHIP_OFF
                  }`}
                >
                  <span>{key === 'all' ? content.all : content.sections[key]}</span>
                  <span aria-hidden className="tabular-nums text-foreground-soft">
                    {summary.status === 'ready' ? countOf(key) : '·'}
                  </span>
                  {summary.status === 'ready' && (
                    <span className="sr-only">{content.openCount(countOf(key))}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <p className="mb-2 mt-5 hidden px-1 text-xs uppercase tracking-[0.15em] text-foreground-soft lg:block">
            {toolsContent.group}
          </p>
          <ul className="mt-2 flex gap-2 overflow-x-auto pb-1 lg:mt-0 lg:flex-col lg:overflow-visible lg:pb-0">
            {(['players', 'audit', 'metrics', ...(isAdmin ? ['plans'] : [])] as ToolKey[]).map(
              (key) => (
                <li key={key} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setTool(key)
                      setNotice('')
                    }}
                    aria-current={tool === key ? 'page' : undefined}
                    className={`landing-focus flex min-h-11 w-full items-center rounded-md border px-3.5 text-sm transition-colors ${
                      tool === key ? CHIP_ON : CHIP_OFF
                    }`}
                  >
                    {toolsContent.nav[key]}
                  </button>
                </li>
              ),
            )}
          </ul>
        </nav>

        {tool ? (
          <div className="flex min-w-0 flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {toolsContent.nav[tool]}
            </h2>
            {tool === 'players' && <PlayersView source={tools} withPlans={false} />}
            {tool === 'plans' && isAdmin && <PlayersView source={tools} withPlans />}
            {tool === 'audit' && <AuditView source={tools} />}
            {tool === 'metrics' && <MetricsView source={tools} />}
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            {chips.length > 0 && (
              <div role="group" aria-label={content.typeFilter} className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={activeType === null}
                  onClick={() => {
                    setType(null)
                    setSelectedId(null)
                  }}
                  className={`${CHIP} ${activeType === null ? CHIP_ON : CHIP_OFF}`}
                >
                  {content.allTypes}
                </button>
                {chips.map((chip) => (
                  <button
                    key={chip.type}
                    type="button"
                    aria-pressed={activeType === chip.type}
                    onClick={() => {
                      setType(chip.type)
                      setSelectedId(null)
                    }}
                    className={`${CHIP} ${activeType === chip.type ? CHIP_ON : CHIP_OFF}`}
                  >
                    {content.caseTypes[chip.type]}
                    <span className="tabular-nums text-foreground-soft">{chip.open}</span>
                  </button>
                ))}
              </div>
            )}

            <p role="status" aria-live="polite" className="min-h-5 text-sm text-accent">
              {notice}
            </p>

            {showingPrints ? (
              <VerificationQueue cases={verifications} archetypes={archetypes} />
            ) : (
              <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
                <CaseList
                  list={list}
                  selectedId={selectedId}
                  onSelect={(id) => {
                    setSelectedId(id)
                    setNotice('')
                  }}
                  onRetry={loadList}
                />
                <CaseDetailView
                  key={selectedId ?? 'none'}
                  source={source}
                  id={selectedId}
                  onClosed={closed}
                  onStale={staleClosed}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CaseList({
  list,
  selectedId,
  onSelect,
  onRetry,
}: {
  list: Loaded<CaseListItem[]>
  selectedId: string | null
  onSelect: (id: string) => void
  onRetry: () => void
}) {
  const content = useModerationPanelContent()
  const { locale } = useLocale()

  if (list.status === 'loading') {
    return <p className="text-sm text-foreground-soft">…</p>
  }
  if (list.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-2 text-sm">
        <p className="text-foreground-soft">{content.loadError}</p>
        <button type="button" onClick={onRetry} className={`${CHIP} ${CHIP_OFF}`}>
          {content.retry}
        </button>
      </div>
    )
  }
  if (list.value.length === 0) {
    return <p className="text-sm text-foreground-soft">{content.emptySection}</p>
  }

  return (
    <ul aria-label={content.listLabel} className="flex flex-col gap-2">
      {list.value.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={selectedId === item.id ? 'true' : undefined}
            className={`landing-focus flex w-full flex-col gap-1 rounded-md border px-3.5 py-3 text-left text-sm transition-colors ${
              selectedId === item.id ? CHIP_ON : CHIP_OFF
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">{content.caseTypes[item.type]}</span>
              {item.overdue && (
                <span className="rounded-full border border-danger px-2 py-0.5 text-[0.7rem] text-danger">
                  {content.overdue}
                </span>
              )}
            </span>
            <span className="text-xs text-foreground-soft">
              {formatDate(item.openedAt, locale)}
            </span>
            <span className="line-clamp-2 text-xs text-foreground-soft">
              {item.preview ?? content.noPreview}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function CaseDetailView({
  source,
  id,
  onClosed,
  onStale,
}: {
  source: CasesSource
  id: string | null
  onClosed: (id: string) => void
  onStale: () => void
}) {
  const content = useModerationPanelContent()
  const { locale } = useLocale()
  const categories = CHARACTER_CONTENT[locale].categories as Record<string, string>
  const [detail, setDetail] = useState<Loaded<CaseDetail | null>>({ status: 'loading' })

  useEffect(() => {
    if (!id) return
    let alive = true
    source
      .detail(id)
      .then((value) => alive && setDetail({ status: 'ready', value }))
      .catch(() => alive && setDetail({ status: 'error' }))
    return () => {
      alive = false
    }
  }, [source, id])

  if (!id) {
    return <p className="text-sm text-foreground-soft">{content.detailEmpty}</p>
  }
  if (detail.status === 'loading') {
    return <p className="text-sm text-foreground-soft">…</p>
  }
  if (detail.status === 'error' || detail.value === null) {
    return <p className="text-sm text-foreground-soft">{content.loadError}</p>
  }
  const item = detail.value

  return (
    <article className="flex flex-col gap-5 rounded-md border border-white/10 bg-surface p-5">
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-semibold text-foreground">
          {content.caseTypes[item.type]}
        </h2>
        <p className="flex flex-wrap items-center gap-x-3 text-xs text-foreground-soft">
          <span>
            {content.openedAt} {formatDate(item.openedAt, locale)}
          </span>
          {item.overdue && <span className="text-danger">{content.overdue}</span>}
          {item.lobbyId && (
            <span>
              {content.lobby} <code>{item.lobbyId.slice(0, 8)}</code>
            </span>
          )}
        </p>
      </header>

      {item.reportReason && (
        <p className="text-sm text-foreground">
          <span className="text-foreground-soft">{content.reportReason}: </span>
          {content.reportReasons[item.reportReason]}
        </p>
      )}

      {item.text && (
        <section aria-label={content.text} className="flex flex-col gap-1">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.text}</p>
        </section>
      )}

      {item.people.length > 0 && (
        <section aria-label={content.people} className="flex flex-col gap-3">
          {item.people.map((person, index) => (
            <div key={index} className="flex flex-col gap-1 rounded-sm border border-white/10 p-3">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-foreground-soft">
                {content.roles[person.role]}
              </p>
              <p className="text-sm text-foreground">
                {person.characters.length === 0
                  ? content.noCharacter
                  : person.characters
                      .map(
                        (character) =>
                          `${character.name ?? '—'} · ${categories[character.category] ?? character.category}`,
                      )
                      .join(' / ')}
              </p>
              <p className="text-xs text-foreground-soft">
                {person.reputation !== null && `${content.reputation} ${person.reputation} · `}
                {content.history(
                  person.history.open,
                  person.history.resolved,
                  person.history.dismissed,
                )}
              </p>
              {person.discordMention && (
                <p className="text-xs text-foreground-soft">
                  {content.discord}: <code>{person.discordMention}</code>
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      <CloseForm source={source} id={item.id} onClosed={onClosed} onStale={onStale} />
    </article>
  )
}

function CloseForm({
  source,
  id,
  onClosed,
  onStale,
}: {
  source: CasesSource
  id: string
  onClosed: (id: string) => void
  onStale: () => void
}) {
  const content = useModerationPanelContent()
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [reason, setReason] = useState<ClosureReason | null>(null)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<'idle' | 'closing' | 'failed'>('idle')

  const reasons = useMemo(() => (outcome ? REASONS_OF[outcome] : []), [outcome])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!outcome || !reason) return
    setStatus('closing')
    const trimmed = note.trim()
    const result = await source.close(id, {
      outcome,
      reason,
      ...(trimmed ? { note: trimmed } : {}),
    })
    if (result === 'closed') {
      onClosed(id)
    } else if (result === 'already_closed') {
      onStale()
    } else {
      setStatus('failed')
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 border-t border-white/10 pt-4">
      <h3 className="text-sm font-medium text-foreground">{content.close.heading}</h3>

      <div role="group" aria-label={content.close.heading} className="flex flex-wrap gap-2">
        {(['resolved', 'dismissed'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={outcome === value}
            onClick={() => {
              setOutcome(value)
              setReason(null)
            }}
            className={`${CHIP} ${outcome === value ? CHIP_ON : CHIP_OFF}`}
          >
            {content.close.outcomes[value]}
          </button>
        ))}
      </div>

      {outcome && (
        <div role="group" aria-label={content.close.reasonLabel} className="flex flex-wrap gap-2">
          {reasons.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={reason === value}
              onClick={() => setReason(value)}
              className={`${CHIP} ${reason === value ? CHIP_ON : CHIP_OFF}`}
            >
              {content.close.reasons[value]}
            </button>
          ))}
        </div>
      )}

      {reason && (
        <>
          <label className="flex flex-col gap-1 text-sm text-foreground">
            {content.close.note}
            <textarea
              value={note}
              maxLength={MAX_NOTE}
              rows={3}
              onChange={(event) => setNote(event.target.value)}
              className="landing-focus w-full rounded-sm border border-white/30 bg-surface px-3.5 py-2.5 text-sm text-foreground"
            />
            <span className="text-xs text-foreground-soft">
              {content.close.noteHint(MAX_NOTE - note.length)}
            </span>
          </label>
          <button
            type="submit"
            disabled={status === 'closing'}
            className="landing-focus landing-sheen min-h-11 self-start rounded-full bg-accent px-5 text-sm font-medium text-background disabled:opacity-60"
          >
            {status === 'closing' ? content.close.closing : content.close.confirm}
          </button>
        </>
      )}

      <p role="alert" className="min-h-5 text-sm text-danger">
        {status === 'failed' && content.close.failed}
      </p>
    </form>
  )
}
