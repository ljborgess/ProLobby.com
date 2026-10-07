'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DISCORD_INVITE_URL } from '@/common/discord/invite'
import { BackAction } from '@/common/ui/back-action'
import type { CharacterCategory } from '@/content/character'
import type { MissingPrerequisite, MovementBand } from '@/content/queue'
import { useCharacterContent } from '@/hooks/use-character-content'
import { useQueueContent } from '@/hooks/use-queue-content'
import { ReputationGauge, type ReputationBand } from '@/modules/account/reputation-gauge'
import type { CharacterView } from '@/modules/character/types'

/** `GET /queue` → `entry` (#228, #232). */
export interface QueueEntryView {
  characterId: string
  category: CharacterCategory
  joinedAt: string
  lobby: { state: string; confirmBy: string; confirmed: boolean } | null
}

export interface QueueState {
  entry: QueueEntryView | null
  blockedUntil: string | null
}

const CATEGORIES: CharacterCategory[] = [
  'goalkeeper',
  'defender',
  'midfielder',
  'winger',
  'striker',
]
const BAND_LEVEL: Record<MovementBand, number> = { low: 1, busy: 2, full: 3 }
const POLL_MS = 5000

const PRIMARY =
  'landing-focus landing-sheen inline-flex items-center justify-center gap-2 self-start rounded-full bg-accent px-5 py-2 text-sm font-medium text-background transition-transform duration-200 hover:scale-[1.04] active:scale-95 disabled:opacity-60 disabled:hover:scale-100'

const MISSING_LINK: Record<MissingPrerequisite, string> = {
  email: '/verifications',
  character: '/account/character',
  discord: '/account/discord',
  discord_server: DISCORD_INVITE_URL,
}

type Refusal =
  | { kind: 'missing'; missing: MissingPrerequisite[] }
  | { kind: 'blocked'; minutes: number }
  | { kind: 'inLobby' }
  | { kind: 'error' }

/**
 * The queue — issue #233. Pick a verified character, join, watch the search,
 * leave. Beside it, the reputation dial and how busy each category is: a band,
 * never a count (RF-008). A refused join lists every missing step at once,
 * each with the way to fix it (RF-002). The 30 s confirmation is #234.
 */
export function QueueScreen({
  initial,
  characters,
  movement,
  reputation,
  reputationBand,
}: {
  initial: QueueState
  characters: CharacterView[]
  movement: Record<CharacterCategory, MovementBand>
  reputation: number
  reputationBand: ReputationBand
}) {
  const content = useQueueContent()
  const categoryContent = useCharacterContent()
  const verified = characters.filter((character) => character.state === 'verified')
  const [state, setState] = useState(initial)
  const [picked, setPicked] = useState(verified[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [refusal, setRefusal] = useState<Refusal | null>(null)
  const searching = state.entry !== null

  // While in the queue, ask again every few seconds: the lobby arrives on its own.
  useEffect(() => {
    if (!searching) return
    const timer = setInterval(async () => {
      try {
        const response = await fetch('/bff/queue')
        if (response.ok) setState((await response.json()) as QueueState)
      } catch {
        // A missed poll is not news; the next one tries again.
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [searching])

  async function join() {
    setBusy(true)
    setRefusal(null)
    try {
      const response = await fetch('/bff/queue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ characterId: picked }),
      })
      const body = (await response.json().catch(() => ({}))) as {
        message?: string
        missing?: MissingPrerequisite[]
        retryAfterSeconds?: number
      }
      if (response.ok) {
        setState({ entry: body as unknown as QueueEntryView, blockedUntil: null })
      } else if (body.message === 'queue_prerequisites_missing' && body.missing) {
        setRefusal({ kind: 'missing', missing: body.missing })
      } else if (body.message === 'queue_blocked') {
        setRefusal({ kind: 'blocked', minutes: Math.ceil((body.retryAfterSeconds ?? 60) / 60) })
      } else {
        setRefusal({ kind: 'error' })
      }
    } catch {
      setRefusal({ kind: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function leave() {
    setBusy(true)
    setRefusal(null)
    try {
      const response = await fetch('/bff/queue', { method: 'DELETE' })
      if (response.ok) {
        setState((current) => ({ ...current, entry: null }))
      } else {
        setRefusal({ kind: response.status === 409 ? 'inLobby' : 'error' })
      }
    } catch {
      setRefusal({ kind: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BackAction href="/verifications" label={content.back} />
      <h1 className="landing-section-title font-display text-foreground">{content.title}</h1>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="landing-card flex flex-col gap-5 rounded-md border border-white/10 bg-surface px-5 py-6 sm:px-7">
          {state.entry ? (
            <Searching
              entry={state.entry}
              code={categoryContent.categoryCodes[state.entry.category]}
            />
          ) : verified.length === 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-foreground-soft">{content.noVerified}</p>
              <Link href="/account/character" className={PRIMARY}>
                {content.goToRoster}
              </Link>
            </div>
          ) : (
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-sm text-foreground-soft">{content.pickHeading}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {verified.map((character) => (
                  <label
                    key={character.id}
                    className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-white/10 px-4 py-3 transition-colors has-[:checked]:border-accent/50 has-[:checked]:bg-accent/5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
                  >
                    <input
                      type="radio"
                      name="character"
                      value={character.id}
                      checked={picked === character.id}
                      onChange={() => setPicked(character.id)}
                      className="sr-only"
                    />
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/12 text-xs font-medium tracking-wide text-foreground">
                      {categoryContent.categoryCodes[character.category]}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium uppercase tracking-wide text-foreground">
                        {character.archetype}
                      </span>
                      <span className="text-xs tabular-nums text-foreground-soft">
                        {categoryContent.roster.elo} {character.elo}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {refusal && <RefusalMessage refusal={refusal} />}

          {state.entry && !state.entry.lobby && (
            <BackAction kind="cancel" onClick={leave} label={content.leave} />
          )}
          {!state.entry && verified.length > 0 && (
            <button type="button" onClick={join} disabled={busy || !picked} className={PRIMARY}>
              {busy ? content.joining : content.join}
            </button>
          )}
        </section>

        <aside className="flex flex-col gap-6">
          <ReputationGauge reputation={reputation} band={reputationBand} />
          <section
            aria-labelledby="movement"
            className="landing-card flex flex-col gap-3 rounded-md border border-white/10 bg-surface px-5 py-5"
          >
            <h2 id="movement" className="text-sm text-foreground-soft">
              {content.movementHeading}
            </h2>
            <ul className="flex flex-col gap-2.5">
              {CATEGORIES.map((category) => (
                <li key={category} className="flex items-center gap-3 text-sm">
                  <span className="w-9 text-xs font-medium tracking-wide text-foreground-soft">
                    {categoryContent.categoryCodes[category]}
                  </span>
                  {/* The word is the information; the bars only agree with it. */}
                  <span aria-hidden className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <span
                        key={level}
                        className={`h-1.5 w-4 rounded-full ${
                          level <= BAND_LEVEL[movement[category]] ? 'bg-accent' : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </span>
                  <span className="text-foreground">{content.bands[movement[category]]}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}

/** The search in progress, or the lobby that arrived. */
function Searching({ entry, code }: { entry: QueueEntryView; code: string }) {
  const content = useQueueContent()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const seconds = Math.max(0, Math.floor((now - new Date(entry.joinedAt).getTime()) / 1000))
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <div role="status" className="flex items-center gap-5">
      <span className="relative flex size-16 shrink-0 items-center justify-center rounded-full border border-dashed border-accent/50 text-sm font-medium tracking-wide text-foreground">
        {!entry.lobby && (
          <span
            aria-hidden
            className="landing-dot absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-accent"
          />
        )}
        {code}
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-display text-xl font-light text-foreground">
          {entry.lobby ? content.placedTitle : content.searching}
        </p>
        <p className="text-sm tabular-nums text-foreground-soft">
          {entry.lobby ? content.placedHint : content.waited(clock)}
        </p>
      </div>
    </div>
  )
}

function RefusalMessage({ refusal }: { refusal: Refusal }) {
  const content = useQueueContent()

  if (refusal.kind === 'missing') {
    return (
      <div role="alert" className="flex flex-col gap-2">
        <p className="text-sm text-foreground">{content.missingHeading}</p>
        <ul className="flex flex-col gap-1.5">
          {refusal.missing.map((item) => (
            <li key={item}>
              <a
                href={MISSING_LINK[item]}
                {...(item === 'discord_server' ? { target: '_blank', rel: 'noreferrer' } : {})}
                className="landing-focus text-sm text-accent underline-offset-4 hover:underline"
              >
                {content.missing[item]}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  const text =
    refusal.kind === 'blocked'
      ? content.blocked(refusal.minutes)
      : refusal.kind === 'inLobby'
        ? content.inLobby
        : content.error
  return (
    <p role="alert" className="text-sm text-danger">
      {text}
    </p>
  )
}
