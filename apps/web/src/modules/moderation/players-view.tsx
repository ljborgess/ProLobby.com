'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useLocale } from '@/common/providers/locale-provider'
import { CHARACTER_CONTENT } from '@/content/character'
import { useModerationPanelContent } from '@/hooks/use-moderation-panel-content'
import { useModerationToolsContent } from '@/hooks/use-moderation-tools-content'
import { CHIP, CHIP_OFF, CHIP_ON, FIELD, formatDate } from './panel-styles'
import {
  MAX_PIX_REFERENCE,
  type PlayerSheet,
  type PlayerSummary,
  type Plan,
  type ToolsSource,
} from './tools'

type Loaded<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; value: T }

/**
 * Players (#314): a search by gamertag or Discord, the list, and one player's
 * sheet, read only. With `withPlans` (the admin's Planos section) the sheet
 * also carries the form that gives or takes a plan.
 */
export function PlayersView({ source, withPlans }: { source: ToolsSource; withPlans: boolean }) {
  const content = useModerationToolsContent()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Loaded<PlayerSummary[]> | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  function search(event: FormEvent) {
    event.preventDefault()
    const term = query.trim()
    if (!term) return
    setSelectedId(null)
    setResults({ status: 'loading' })
    source
      .searchPlayers(term)
      .then((value) => setResults({ status: 'ready', value }))
      .catch(() => setResults({ status: 'error' }))
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={search} className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-sm text-foreground">
          {content.players.searchLabel}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={64}
            className={FIELD}
          />
        </label>
        <p className="text-xs text-foreground-soft">{content.players.searchHint}</p>
        <button
          type="submit"
          disabled={query.trim() === ''}
          className="landing-focus min-h-11 self-start rounded-full bg-accent px-5 text-sm font-medium text-background disabled:opacity-60"
        >
          {content.players.search}
        </button>
      </form>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Results results={results} selectedId={selectedId} onSelect={setSelectedId} />
        {selectedId && (
          <Sheet key={selectedId} source={source} accountId={selectedId} withPlans={withPlans} />
        )}
      </div>
    </div>
  )
}

function playerName(player: PlayerSummary, fallback: string): string {
  return player.characters.map((c) => c.name ?? '—').join(' / ') || fallback
}

function Results({
  results,
  selectedId,
  onSelect,
}: {
  results: Loaded<PlayerSummary[]> | null
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const content = useModerationToolsContent()

  if (results === null) {
    return <p className="text-sm text-foreground-soft">{content.players.prompt}</p>
  }
  if (results.status === 'loading') {
    return <p className="text-sm text-foreground-soft">…</p>
  }
  if (results.status === 'error') {
    return <p className="text-sm text-foreground-soft">{content.loadError}</p>
  }
  if (results.value.length === 0) {
    return <p className="text-sm text-foreground-soft">{content.players.noResults}</p>
  }
  return (
    <ul aria-label={content.players.results} className="flex flex-col gap-2">
      {results.value.map((player) => (
        <li key={player.accountId}>
          <button
            type="button"
            onClick={() => onSelect(player.accountId)}
            aria-current={selectedId === player.accountId ? 'true' : undefined}
            className={`landing-focus flex w-full flex-col gap-1 rounded-md border px-3.5 py-3 text-left text-sm transition-colors ${
              selectedId === player.accountId ? CHIP_ON : CHIP_OFF
            }`}
          >
            <span className="font-medium text-foreground">
              {playerName(player, content.players.noCharacter)}
            </span>
            <span className="text-xs text-foreground-soft">
              {content.plans[player.plan]}
              {player.reputation !== null &&
                ` · ${content.players.reputation} ${player.reputation}`}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function Sheet({
  source,
  accountId,
  withPlans,
}: {
  source: ToolsSource
  accountId: string
  withPlans: boolean
}) {
  const content = useModerationToolsContent()
  const caseTypes = useModerationPanelContent().caseTypes as Record<string, string>
  const { locale } = useLocale()
  const categories = CHARACTER_CONTENT[locale].categories as Record<string, string>
  const [sheet, setSheet] = useState<Loaded<PlayerSheet | null>>({ status: 'loading' })
  useEffect(() => {
    let alive = true
    source
      .player(accountId)
      .then((value) => alive && setSheet({ status: 'ready', value }))
      .catch(() => alive && setSheet({ status: 'error' }))
    return () => {
      alive = false
    }
  }, [source, accountId])

  if (sheet.status === 'loading') return <p className="text-sm text-foreground-soft">…</p>
  if (sheet.status === 'error' || sheet.value === null) {
    return <p className="text-sm text-foreground-soft">{content.loadError}</p>
  }
  const player = sheet.value
  const name = playerName(player, content.players.noCharacter)

  return (
    <article
      aria-label={content.players.sheet}
      className="flex flex-col gap-5 rounded-md border border-white/10 bg-surface p-5"
    >
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-semibold text-foreground">{name}</h2>
        <p className="text-xs text-foreground-soft">
          {content.players.plan}: {content.plans[player.plan]}
          {player.reputation !== null && ` · ${content.players.reputation} ${player.reputation}`}
        </p>
        {player.discordMention && (
          <p className="text-xs text-foreground-soft">
            {content.players.discord}: <code>{player.discordMention}</code>
          </p>
        )}
      </header>

      <section aria-label={content.players.characters} className="flex flex-col gap-1">
        {player.characters.length === 0 ? (
          <p className="text-sm text-foreground-soft">{content.players.noCharacter}</p>
        ) : (
          player.characters.map((character, index) => (
            <p key={index} className="text-sm text-foreground">
              {character.name ?? '—'} · {categories[character.category] ?? character.category}
            </p>
          ))
        )}
      </section>

      <section aria-label={content.players.cases} className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-foreground">{content.players.cases}</h3>
        {player.cases.length === 0 ? (
          <p className="text-sm text-foreground-soft">{content.players.noCases}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm text-foreground-soft">
            {player.cases.map((item) => (
              <li key={item.id}>
                {formatDate(item.openedAt, locale)} · {caseTypes[item.type] ?? item.type} ·{' '}
                {content.caseStates[item.state]}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label={content.players.punishments} className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-foreground">{content.players.punishments}</h3>
        {player.punishments.length === 0 ? (
          <p className="text-sm text-foreground-soft">{content.players.noPunishments}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm text-foreground-soft">
            {player.punishments.map((item, index) => (
              <li key={index}>
                {content.players.punishmentKinds[item.kind] ?? item.kind} {content.players.from}{' '}
                {formatDate(item.from, locale)}{' '}
                {item.until
                  ? `${content.players.until} ${formatDate(item.until, locale)}`
                  : `(${content.players.ongoing})`}
              </li>
            ))}
          </ul>
        )}
      </section>

      {withPlans && (
        <PlanForm
          source={source}
          accountId={player.accountId}
          who={name}
          plan={player.plan}
          onChanged={(plan) => setSheet({ status: 'ready', value: { ...player, plan } })}
        />
      )}
    </article>
  )
}

function PlanForm({
  source,
  accountId,
  who,
  plan,
  onChanged,
}: {
  source: ToolsSource
  accountId: string
  who: string
  plan: Plan
  onChanged: (plan: Plan) => void
}) {
  const content = useModerationToolsContent()
  const [pix, setPix] = useState('')
  const [pending, setPending] = useState<Plan | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'forbidden' | 'failed'>('idle')
  const [missingPix, setMissingPix] = useState(false)

  function ask(next: Plan) {
    setStatus('idle')
    if (next !== 'none' && pix.trim() === '') {
      setMissingPix(true)
      return
    }
    setMissingPix(false)
    setPending(next)
  }

  async function confirm() {
    if (!pending) return
    setStatus('saving')
    const result = await source.setPlan(accountId, pending, pix.trim())
    if (result === 'ok') {
      onChanged(pending)
      setStatus('done')
      setPending(null)
      setPix('')
    } else {
      setStatus(result === 'forbidden' ? 'forbidden' : 'failed')
      setPending(null)
    }
  }

  return (
    <section
      aria-label={content.plan.heading}
      className="flex flex-col gap-3 border-t border-white/10 pt-4"
    >
      <h3 className="text-sm font-medium text-foreground">{content.plan.heading}</h3>
      <p className="text-xs text-foreground-soft">
        {content.plan.current}: {content.plans[plan]}
      </p>

      <label className="flex flex-col gap-1 text-sm text-foreground">
        {content.plan.pix}
        <input
          value={pix}
          maxLength={MAX_PIX_REFERENCE}
          onChange={(event) => setPix(event.target.value)}
          aria-invalid={missingPix || undefined}
          className={FIELD}
        />
        <span className="text-xs text-foreground-soft">{content.plan.pixHint}</span>
      </label>
      {missingPix && (
        <p role="alert" className="text-sm text-danger">
          {content.plan.pixRequired}
        </p>
      )}

      {pending === null ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => ask('founder')} className={`${CHIP} ${CHIP_OFF}`}>
            {content.plan.activate.founder}
          </button>
          <button type="button" onClick={() => ask('supporter')} className={`${CHIP} ${CHIP_OFF}`}>
            {content.plan.activate.supporter}
          </button>
          <button
            type="button"
            onClick={() => ask('none')}
            disabled={plan === 'none'}
            className={`${CHIP} ${CHIP_OFF} disabled:opacity-50`}
          >
            {content.plan.revoke}
          </button>
        </div>
      ) : (
        <div role="alertdialog" aria-label={content.plan.heading} className="flex flex-col gap-3">
          <p className="text-sm text-foreground">
            {pending === 'none'
              ? content.plan.confirmRevoke(who)
              : content.plan.confirmActivate(content.plans[pending], who)}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={status === 'saving'}
              className="landing-focus min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-background disabled:opacity-60"
            >
              {status === 'saving' ? content.plan.saving : content.plan.confirm}
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              disabled={status === 'saving'}
              className={`${CHIP} ${CHIP_OFF}`}
            >
              {content.plan.cancel}
            </button>
          </div>
        </div>
      )}

      <p role="status" aria-live="polite" className="min-h-5 text-sm text-foreground-soft">
        {status === 'done' && content.plan.done}
        {status === 'forbidden' && content.plan.forbidden}
        {status === 'failed' && content.plan.failed}
      </p>
    </section>
  )
}
