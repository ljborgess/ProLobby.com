'use client'

import { type FormEvent, useState } from 'react'
import type { CharacterCategory } from '@/content/character'
import type { QueueContent, UserReportReason } from '@/content/queue'
import { useCharacterContent } from '@/hooks/use-character-content'
import { useQueueContent } from '@/hooks/use-queue-content'
import type { LobbyView } from './lobby-stages'
import { clockOf, PRIMARY, SECONDARY } from './queue-ui'

export type Side = 'a' | 'b'

/** Someone of the match, by their row in the lobby: account ids never leave the API. */
export interface PlayerView {
  participationId: string
  gamertag: string | null
  category: CharacterCategory
  /** What this account gave them; always null for an opponent. */
  myRating: 'thumbs_up' | 'negative' | null
}

/** `entry.lobby.myReport` (4.1). */
export interface ReportView {
  id: string
  side: Side
  scoreA: number
  scoreB: number
  absent: string[]
}

/** `GET /queue` → `lastMatch`: the latest match with a result (4.1, 4.2). */
export interface LastMatchView {
  lobbyId: string
  state: string
  side: Side
  scoreA: number | null
  scoreB: number | null
  /** Set while this account can still contest. */
  contestUntil: string | null
  teammates: PlayerView[]
  opponents: PlayerView[]
  /** Teammates can be rated until here; null otherwise. */
  rateUntil: string | null
}

// The web proxy buffers at most 10 MB of body; the multipart wrapping of the
// file needs a little of it.
const MAX_BYTES = 10 * 1024 * 1024 - 64 * 1024
const REASONS: UserReportReason[] = ['fraud', 'disconnect', 'behavior']
const FIELD =
  'w-full rounded-sm border border-white/15 bg-white/5 px-3 py-2 text-sm text-foreground'

/** This side's goals first. */
const ours = (side: Side, a: number, b: number) => (side === 'a' ? [a, b] : [b, a])
const toScore = (side: Side, mine: number, theirs: number) =>
  side === 'a' ? { scoreA: mine, scoreB: theirs } : { scoreA: theirs, scoreB: mine }
const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

/** A write under `/bff/queue`: null when it went through, else the API's reason. */
async function call(path: string, init: RequestInit): Promise<string | null> {
  try {
    const response = await fetch(`/bff/queue/${path}`, init)
    if (response.ok) return null
    const { message } = (await response.json().catch(() => ({}))) as { message?: unknown }
    return typeof message === 'string' ? message : 'generic'
  } catch {
    return 'generic'
  }
}

const errorText = (result: QueueContent['result'], code: string) =>
  result.errors[code] ?? result.errors.generic!

function Failure({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-danger">
      {message}
    </p>
  )
}

/** A name to show: the gamertag, or the place when there is none. */
function useNameOf() {
  const codes = useCharacterContent().categoryCodes
  return (player: PlayerView) => player.gamertag ?? codes[player.category]
}

/** The two scores, this side first. */
function ScoreFields({ mine, theirs }: { mine?: number; theirs?: number }) {
  const r = useQueueContent().result
  return (
    <div className="flex w-full items-end gap-3">
      {(
        [
          ['mine', r.mine, mine],
          ['theirs', r.theirs, theirs],
        ] as const
      ).map(([name, label, value], index) => (
        <label key={name} className="flex flex-1 flex-col gap-1 text-xs text-foreground-soft">
          {label}
          <input
            name={name}
            type="number"
            inputMode="numeric"
            required
            min={0}
            max={20}
            step={1}
            defaultValue={value}
            autoFocus={index === 0}
            className={`${FIELD} text-center text-2xl tabular-nums`}
          />
        </label>
      ))}
    </div>
  )
}

/**
 * The result inside the lobby (4.1): the countdown until the print is
 * accepted, then the report — score, print and who left — and once sent,
 * the score as sent, fixable while the other side has not reported.
 */
export function ReportStep({
  lobby,
  now,
  onChanged,
}: {
  lobby: LobbyView
  now: number
  onChanged: () => Promise<void>
}) {
  const r = useQueueContent().result
  const opensIn = lobby.reportableFrom ? new Date(lobby.reportableFrom).getTime() - now : 0
  if (opensIn > 0) {
    return <p className="text-sm text-foreground-soft">{r.reportOpensIn(clockOf(opensIn))}</p>
  }
  return lobby.myReport ? (
    <SentReport lobby={lobby} report={lobby.myReport} now={now} onChanged={onChanged} />
  ) : (
    <ReportForm lobby={lobby} onChanged={onChanged} />
  )
}

function ReportForm({ lobby, onChanged }: { lobby: LobbyView; onChanged: () => Promise<void> }) {
  const r = useQueueContent().result
  const nameOf = useNameOf()
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const players = [
    ...(lobby.players?.teammates ?? []).map((player) => ({ player, where: r.teammate })),
    ...(lobby.players?.opponents ?? []).map((player) => ({ player, where: r.opponent })),
  ]

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    // Checked here, not with `required`: the message says what is missing.
    const print = (event.currentTarget.elements.namedItem('print') as HTMLInputElement).files?.[0]
    if (!print || print.size === 0) {
      setFailed(r.errors.print_required!)
      return
    }
    if (print.size > MAX_BYTES) {
      setFailed(r.errors.payload_too_large!)
      return
    }
    const score = toScore(lobby.side, Number(form.get('mine')), Number(form.get('theirs')))
    const body = new FormData()
    body.append('scoreA', String(score.scoreA))
    body.append('scoreB', String(score.scoreB))
    const absent = form.getAll('absent')
    if (absent.length) body.append('absent', absent.join(','))
    body.append('print', print)

    setSending(true)
    setFailed(null)
    const code = await call('report', { method: 'POST', body })
    setSending(false)
    if (code) setFailed(errorText(r, code))
    else await onChanged().catch(() => {})
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-4 text-left">
      <h3 className="text-center text-[0.7rem] font-medium uppercase tracking-[0.2em] text-foreground-soft">
        {r.reportTitle}
      </h3>
      <ScoreFields />
      <label className="flex flex-col gap-1 text-xs text-foreground-soft">
        {r.printLabel}
        <input
          name="print"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-foreground"
        />
        <span>{r.printHint}</span>
      </label>
      {players.length > 0 && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-xs text-foreground-soft">{r.absentLegend}</legend>
          {players.map(({ player, where }) => (
            <label
              key={player.participationId}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <input type="checkbox" name="absent" value={player.participationId} />
              {nameOf(player)}
              <span className="text-xs text-foreground-soft">· {where}</span>
            </label>
          ))}
          <p className="text-xs text-foreground-soft">{r.absentHint}</p>
        </fieldset>
      )}
      <Failure message={failed} />
      <button type="submit" disabled={sending} className={`${PRIMARY} py-3 text-base`}>
        {sending ? r.sending : r.send}
      </button>
    </form>
  )
}

function SentReport({
  lobby,
  report,
  now,
  onChanged,
}: {
  lobby: LobbyView
  report: ReportView
  now: number
  onChanged: () => Promise<void>
}) {
  const r = useQueueContent().result
  const [editing, setEditing] = useState(false)
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [mine, theirs] = ours(lobby.side, report.scoreA, report.scoreB)
  const confirmLeft = lobby.reportConfirmBy ? new Date(lobby.reportConfirmBy).getTime() - now : 0

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSending(true)
    setFailed(null)
    const code = await call(
      'report',
      json('PUT', toScore(lobby.side, Number(form.get('mine')), Number(form.get('theirs')))),
    )
    setSending(false)
    if (code) {
      setFailed(errorText(r, code))
      return
    }
    setEditing(false)
    await onChanged().catch(() => {})
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <p className="text-sm text-foreground">{r.sent(mine!, theirs!)}</p>
      {confirmLeft > 0 && (
        <p className="text-sm text-foreground-soft">{r.otherSideBy(clockOf(confirmLeft))}</p>
      )}
      {editing ? (
        <form onSubmit={save} className="flex w-full flex-col gap-3">
          <ScoreFields mine={mine} theirs={theirs} />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={`${SECONDARY} flex-1`}
            >
              {r.cancel}
            </button>
            <button type="submit" disabled={sending} className={`${PRIMARY} flex-1`}>
              {r.saveCorrection}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className={SECONDARY}>
          {r.correct}
        </button>
      )}
      <Failure message={failed} />
    </div>
  )
}

/**
 * The latest match, once it settled and the queue entry is gone (4.1, 4.2):
 * its result, the contest while a one-sided result can still be contested,
 * the teammates' rating for 48 h and a report against anyone of it. Opens by
 * itself while there is something to answer.
 */
export function LastMatchPanel({
  match,
  now,
  onChanged,
}: {
  match: LastMatchView
  now: number
  onChanged: () => Promise<void>
}) {
  const r = useQueueContent().result
  const nameOf = useNameOf()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const rating =
    match.rateUntil !== null &&
    new Date(match.rateUntil).getTime() > now &&
    match.teammates.length > 0
  const score =
    match.scoreA !== null && match.scoreB !== null
      ? ours(match.side, match.scoreA, match.scoreB)
      : null

  async function act(path: string, body: unknown) {
    setBusy(true)
    setFailed(null)
    const code = await call(path, json('POST', body))
    setBusy(false)
    if (code) setFailed(errorText(r, code))
    await onChanged().catch(() => {})
  }

  return (
    <details
      open={match.contestUntil !== null || rating}
      className="mb-3 max-h-[45svh] overflow-y-auto rounded-[10px] border border-white/10 bg-background/80 px-4 py-3 backdrop-blur-sm"
    >
      <summary className="landing-focus cursor-pointer text-sm text-foreground">
        {r.lastTitle}
        {score && <span className="ml-2 tabular-nums">{`${score[0]} × ${score[1]}`}</span>}
      </summary>
      <div className="mt-3 flex flex-col gap-4">
        <p className="text-sm text-foreground-soft">{r.states[match.state]}</p>

        {match.contestUntil && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => act('contest', { lobbyId: match.lobbyId })}
              className={SECONDARY}
            >
              {r.contest}
            </button>
            <span className="text-xs text-foreground-soft">
              {r.contestUntil(
                Math.max(1, Math.ceil((new Date(match.contestUntil).getTime() - now) / 3_600_000)),
              )}
            </span>
          </div>
        )}

        {rating && (
          <section aria-labelledby="rate-title" className="flex flex-col gap-2">
            <h3 id="rate-title" className="text-sm text-foreground">
              {r.rateTitle}
            </h3>
            <p className="text-xs text-foreground-soft">{r.rateHint}</p>
            <ul className="flex flex-col gap-2">
              {match.teammates.map((player) => (
                <li
                  key={player.participationId}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="text-sm text-foreground">{nameOf(player)}</span>
                  <span className="flex gap-2">
                    {(
                      [
                        ['thumbs_up', r.thumbsUp],
                        ['negative', r.negative],
                      ] as const
                    ).map(([kind, label]) => (
                      <button
                        key={kind}
                        type="button"
                        aria-pressed={player.myRating === kind}
                        disabled={busy || player.myRating !== null}
                        onClick={() =>
                          act('ratings', {
                            lobbyId: match.lobbyId,
                            participationId: player.participationId,
                            kind,
                          })
                        }
                        className={`${SECONDARY} px-3 py-1.5 text-xs aria-pressed:border-accent aria-pressed:text-foreground`}
                      >
                        {label}
                      </button>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Failure message={failed} />
        <PersonReport match={match} nameOf={nameOf} />
      </div>
    </details>
  )
}

/** A report against anyone of the match, either side (4.2); never shown to them. */
function PersonReport({
  match,
  nameOf,
}: {
  match: LastMatchView
  nameOf: (player: PlayerView) => string
}) {
  const r = useQueueContent().result
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const people = [...match.teammates, ...match.opponents]
  if (people.length === 0) return null
  if (sent) {
    return (
      <p role="status" className="text-sm text-foreground">
        {r.reportSent}
      </p>
    )
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="landing-focus self-start text-sm text-accent underline-offset-4 hover:underline"
      >
        {r.reportPerson}
      </button>
    )
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    // The browser's minLength counts the spaces the trim drops; the API does not.
    const message = String(form.get('message') ?? '').trim()
    if (message.length < 20) {
      setFailed(r.errors.message_too_short!)
      return
    }
    setSending(true)
    setFailed(null)
    const code = await call(
      'user-reports',
      json('POST', {
        lobbyId: match.lobbyId,
        participationId: form.get('participationId'),
        reason: form.get('reason'),
        message,
      }),
    )
    setSending(false)
    if (code) setFailed(errorText(r, code))
    else setSent(true)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <h3 className="text-sm text-foreground">{r.reportPerson}</h3>
      <label className="flex flex-col gap-1 text-xs text-foreground-soft">
        {r.person}
        <select name="participationId" required className={FIELD}>
          <optgroup label={r.teammate}>
            {match.teammates.map((player) => (
              <option key={player.participationId} value={player.participationId}>
                {nameOf(player)}
              </option>
            ))}
          </optgroup>
          <optgroup label={r.opponent}>
            {match.opponents.map((player) => (
              <option key={player.participationId} value={player.participationId}>
                {nameOf(player)}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-foreground-soft">
        {r.reason}
        <select name="reason" required className={FIELD}>
          {REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {r.reasons[reason]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-foreground-soft">
        {r.message}
        <textarea
          name="message"
          required
          minLength={20}
          maxLength={2000}
          rows={3}
          className={FIELD}
        />
        <span>{r.messageHint}</span>
      </label>
      <Failure message={failed} />
      <div className="flex gap-3">
        <button type="button" onClick={() => setOpen(false)} className={`${SECONDARY} flex-1`}>
          {r.cancel}
        </button>
        <button type="submit" disabled={sending} className={`${PRIMARY} flex-1`}>
          {r.reportSend}
        </button>
      </div>
    </form>
  )
}
