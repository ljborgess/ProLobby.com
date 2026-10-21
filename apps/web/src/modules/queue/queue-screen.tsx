'use client'

import Link from 'next/link'
import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from 'react'
import { DISCORD_INVITE_URL } from '@/common/discord/invite'
import { BackAction } from '@/common/ui/back-action'
import { LanguageSwitcher } from '@/common/ui/language-switcher'
import { DISCORD_BLURPLE, DiscordMark, MailMark, PlayerCardMark } from '@/common/ui/icons'
import type { CharacterCategory } from '@/content/character'
import type { MissingPrerequisite, MovementBand, QueueContent } from '@/content/queue'
import { useCharacterContent } from '@/hooks/use-character-content'
import { useQueueContent } from '@/hooks/use-queue-content'
import { ReputationGauge, type ReputationBand } from '@/modules/account/reputation-gauge'
import { CATEGORY_ORDER, Shirt } from '@/modules/character/roster'
import { archetypeLabel, type CharacterView } from '@/modules/character/types'
import { LobbyOverlay, type LobbyView } from './lobby-stages'
import { clockOf, PRIMARY } from './queue-ui'
import { LastMatchPanel, type LastMatchView } from './result-stages'

/** `GET /queue` → `entry` (#228, #232, #252). */
export interface QueueEntryView {
  characterId: string
  category: CharacterCategory
  joinedAt: string
  /** Searching again because a lobby of this entry was cancelled, and why. */
  cancelledLobby: { state: 'cancelled_no_fault' | 'cancelled_by_captain'; endedAt: string } | null
  lobby: LobbyView | null
}

export interface QueueState {
  entry: QueueEntryView | null
  blockedUntil: string | null
  /** The latest match with a result, once its entry is gone (4.1). */
  lastMatch?: LastMatchView | null
}

const POLL_MS = 5000
/** Inside a lobby the steps count in seconds: ask more often. */
const LOBBY_POLL_MS = 2000
const BAND_LEVEL: Record<MovementBand, number> = { low: 1, busy: 2, full: 3 }
const ARCHES = Array.from({ length: 9 }, (_, index) => index)

/** RF-003, drawn: ±150, +50 every 2 min of search, ±400 at most. */
function bandAt(waitedMs: number): number {
  return Math.min(150 + 50 * Math.floor(waitedMs / 120_000), 400)
}

const MISSING: Record<MissingPrerequisite, { href: string; icon: React.ReactNode }> = {
  email: { href: '/verifications', icon: <MailMark className="size-4" /> },
  character: { href: '/account/character', icon: <PlayerCardMark className="size-4" /> },
  discord: { href: '/account/discord', icon: <DiscordMark className="size-4" /> },
  discord_server: { href: DISCORD_INVITE_URL, icon: <DiscordMark className="size-4" /> },
}

type Notice = keyof Omit<QueueContent['notice'], 'dismiss'>

/** Why a search started over, when the entry says (#252). */
function cancelNotice(entry: QueueEntryView | null): Notice | null {
  const cancelled = entry?.lobby ? null : entry?.cancelledLobby
  if (!cancelled) return null
  return cancelled.state === 'cancelled_by_captain' ? 'byCaptain' : 'noFault'
}

type Refusal =
  { kind: 'missing'; missing: MissingPrerequisite[] } | { kind: 'inLobby' } | { kind: 'error' }

/** Now, ticking once a second while `on`. */
function useNow(on: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!on) return
    const tick = () => setNow(Date.now())
    const first = setTimeout(tick, 0)
    const timer = setInterval(tick, 1000)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [on])
  return now
}

/**
 * The camera is your head: the pointer's place over the scene, as
 * --look-x / --look-y from −1 to 1, written straight to the element so a
 * moving mouse never re-renders React. Only for a fine pointer with motion
 * allowed; on touch or reduced motion the scene stays put.
 */
function useLook() {
  const frame = useRef(0)

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const element = event.currentTarget
    const box = element.getBoundingClientRect()
    const x = ((event.clientX - box.left) / box.width) * 2 - 1
    const y = ((event.clientY - box.top) / box.height) * 2 - 1
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      element.style.setProperty('--look-x', x.toFixed(3))
      element.style.setProperty('--look-y', y.toFixed(3))
    })
  }

  function onPointerLeave(event: PointerEvent<HTMLElement>) {
    cancelAnimationFrame(frame.current)
    event.currentTarget.style.setProperty('--look-x', '0')
    event.currentTarget.style.setProperty('--look-y', '0')
  }

  return { onPointerMove, onPointerLeave }
}

/** Motes of dust in the tunnel light, fixed so the server and client agree. */
const DUST = Array.from({ length: 16 }, (_, index) => ({
  left: 38 + ((index * 37) % 24),
  top: 40 + ((index * 53) % 22),
  drift: ((index * 29) % 40) - 20,
  time: 5 + ((index * 17) % 5),
  delay: -((index * 7) % 9),
  size: index % 3 === 0 ? 3 : 2,
}))

/** An ISO instant `seconds` from now, for a block whose end the API left out. */
function deadlineIn(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString()
}

/**
 * The queue — issue #233 — as a walk from the dressing room to the pitch.
 *
 * - **Dressing room (picking):** one locker per place. A verified character
 *   hangs in its locker as a shirt; an empty place is a closed door. Each
 *   locker's plate says how busy that place is (RF-008: a band, never a
 *   count). Choosing switches the locker's light on.
 * - **Tunnel (searching):** first person, the arches coming at you and your
 *   shirt walking ahead. The stadium light at the end grows with the elo band
 *   the search accepts (RF-003), so the picture changes only when the rule
 *   does. The queue only knows you and the clock, and that is all it shows.
 * - **Pitch (found):** the walk turns into a run, the light floods the
 *   screen, the floodlights come on and the 30 s card rises with the two
 *   answers (#232).
 *
 * A refused join lists every missing step at once, each with its way out
 * (RF-002); a refusal's block counts down on its own (RF-009).
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
  const codes = useCharacterContent().categoryCodes
  const verified = characters.filter((character) => character.state === 'verified')
  const [state, setState] = useState(initial)
  // The ring's turn, cumulative so it always goes the short way round.
  const [spin, setSpin] = useState(() => {
    const first = CATEGORY_ORDER.findIndex((category) =>
      verified.some((character) => character.category === category),
    )
    return -Math.max(first, 0) * 72
  })
  const [busy, setBusy] = useState(false)
  const [refusal, setRefusal] = useState<Refusal | null>(null)
  const [notice, setNotice] = useState<Notice | null>(() => cancelNotice(initial.entry))
  const lastLobby = useRef(initial.entry?.lobby ?? null)
  // Each cancellation is told once: the entry keeps saying it while searching,
  // and an older one must not stand in for a lobby undone later.
  const toldCancel = useRef(initial.entry?.cancelledLobby?.endedAt ?? null)

  /**
   * Every new queue state goes through here, to tell why the search started
   * over: a cancelled lobby says so in the entry; one undone in the 30 s
   * leaves no trace, so it is the lobby vanishing from under the 30 s card.
   */
  function apply(next: QueueState) {
    const before = lastLobby.current
    lastLobby.current = next.entry?.lobby ?? null
    if (!next.entry) {
      setNotice(null)
    } else if (!next.entry.lobby) {
      const cancelled = cancelNotice(next.entry)
      const endedAt = next.entry.cancelledLobby?.endedAt ?? null
      // The lobby we were in started 30 s before its confirmBy: a cancellation
      // from before that is an old one, and that lobby was undone in the 30 s.
      const startedAt = before ? new Date(before.confirmBy).getTime() - 30_000 : null
      const ours =
        endedAt !== null && (startedAt === null || new Date(endedAt).getTime() >= startedAt)
      if (cancelled && ours && endedAt !== toldCancel.current) {
        toldCancel.current = endedAt
        setNotice(cancelled)
      } else if (before?.state === 'waiting_players') {
        toldCancel.current = endedAt
        setNotice('undone')
      } else if (cancelled && endedAt !== toldCancel.current) {
        toldCancel.current = endedAt
        setNotice(cancelled)
      }
    } else {
      setNotice(null)
    }
    setState(next)
  }

  async function reload() {
    const response = await fetch('/bff/queue')
    if (response.ok) apply((await response.json()) as QueueState)
  }
  const now = useNow(state.entry !== null || state.blockedUntil !== null)

  const focus = (((Math.round(-spin / 72) % 5) + 5) % 5) as number
  const chosen = verified.find((character) => character.category === CATEGORY_ORDER[focus])
  const picked = chosen?.id ?? ''
  const blockedLeft = state.blockedUntil ? new Date(state.blockedUntil).getTime() - now : 0
  const blocked = blockedLeft > 0
  const walking = characters.find((character) => character.id === state.entry?.characterId)

  /** Turns the ring the short way to locker `index`. */
  const turnTo = (index: number) => {
    const delta = ((index - focus + 7) % 5) - 2
    setSpin((current) => current - delta * 72)
  }
  const step = (direction: 1 | -1) => setSpin((current) => current - direction * 72)

  // While in the queue, ask again every few seconds: the lobby arrives on its own.
  const inQueue = state.entry !== null
  const inLobby = state.entry?.lobby != null
  useEffect(() => {
    if (!inQueue) return
    const timer = setInterval(
      async () => {
        try {
          await reload()
        } catch {
          // A missed poll is not news; the next one tries again.
        }
      },
      inLobby ? LOBBY_POLL_MS : POLL_MS,
    )
    return () => clearInterval(timer)
    // reload only reads refs and setters; the interval restarts on the two flags.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inQueue, inLobby])

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
        blockedUntil?: string
        retryAfterSeconds?: number
      }
      if (response.ok) {
        apply({ entry: body as unknown as QueueEntryView, blockedUntil: null })
      } else if (body.message === 'queue_prerequisites_missing' && body.missing) {
        setRefusal({ kind: 'missing', missing: body.missing })
      } else if (body.message === 'queue_blocked') {
        const until = body.blockedUntil ?? deadlineIn(body.retryAfterSeconds ?? 60)
        setState((current) => ({ ...current, blockedUntil: until }))
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
        apply({ ...state, entry: null })
      } else {
        setRefusal({ kind: response.status === 409 ? 'inLobby' : 'error' })
      }
    } catch {
      setRefusal({ kind: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const scene = state.entry ? (state.entry.lobby ? 'found' : 'searching') : 'picking'
  const look = useLook()

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* The scene is the whole window; everything else sits over it. */}
      <section {...look} className="absolute inset-0">
        {state.entry ? (
          <Tunnel
            entry={state.entry}
            now={now}
            code={codes[state.entry.category]}
            archetype={walking ? archetypeLabel(walking.archetype) : codes[state.entry.category]}
            exit={scene === 'found'}
          />
        ) : (
          <Carousel
            characters={verified}
            movement={movement}
            spin={spin}
            focus={focus}
            onTurnTo={turnTo}
            onStep={step}
          />
        )}
      </section>

      <header className="pointer-events-none relative z-10 flex items-start justify-between gap-4 px-4 pt-4 sm:px-8 sm:pt-6">
        <div className="pointer-events-auto flex items-center gap-4">
          <BackAction href="/verifications" label={content.back} />
          <h1 className="font-display text-[clamp(1.65rem,1.1rem+1.7vw,2.4rem)] font-light leading-none tracking-[-0.028em] text-foreground">
            {content.title}
          </h1>
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-3">
          <LanguageSwitcher />
          <ReputationGauge inline reputation={reputation} band={reputationBand} />
        </div>
      </header>

      <div className="flex-1" />

      <footer className="pointer-events-none relative z-10 flex flex-col gap-3 px-4 pb-5 sm:px-8 sm:pb-7">
        <div className="pointer-events-auto">
          {scene === 'picking' && state.lastMatch && (
            <LastMatchPanel match={state.lastMatch} now={now} onChanged={reload} />
          )}
          {scene === 'picking' &&
            (verified.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-foreground-soft">{content.noVerified}</p>
                <Link href="/account/character" className={PRIMARY}>
                  {content.goToRoster}
                </Link>
              </div>
            ) : blocked ? (
              <BlockDial left={blockedLeft} />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="flex min-w-0 items-baseline gap-2 text-sm text-foreground-soft">
                  {chosen ? (
                    <>
                      <span className="truncate font-display text-lg font-medium tracking-tight text-foreground">
                        {archetypeLabel(chosen.archetype)}
                      </span>
                      <span className="tabular-nums">Elo {chosen.elo}</span>
                    </>
                  ) : (
                    <Link
                      href="/account/character"
                      className="landing-focus text-accent underline-offset-4 hover:underline"
                    >
                      {content.goToRoster}
                    </Link>
                  )}
                </p>
                <div>
                  <button
                    type="button"
                    onClick={join}
                    disabled={busy || !chosen}
                    className={PRIMARY}
                  >
                    {busy
                      ? content.joining
                      : chosen
                        ? content.joinAs(codes[chosen.category])
                        : content.join}
                  </button>
                </div>
              </div>
            ))}

          {scene === 'searching' && notice && (
            <div
              role="status"
              className="mb-3 flex flex-wrap items-center justify-between gap-3 border-l-2 border-accent pl-3"
            >
              <p className="max-w-xl text-sm text-foreground">{content.notice[notice]}</p>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="landing-focus text-sm text-accent underline-offset-4 hover:underline"
              >
                {content.notice.dismiss}
              </button>
            </div>
          )}
          {scene === 'searching' && (
            <BackAction kind="cancel" onClick={leave} label={content.leave} />
          )}
          {scene === 'found' && (
            <p className="text-sm text-foreground-soft">{content.placedHint}</p>
          )}

          {refusal && (
            <div className="mt-3">
              <RefusalMessage refusal={refusal} />
            </div>
          )}
        </div>
      </footer>

      {state.entry?.lobby && (
        <LobbyOverlay
          lobby={state.entry.lobby}
          now={now}
          code={codes[state.entry.category]}
          onChanged={reload}
        />
      )}
    </div>
  )
}

/**
 * A side of the ring: a tall, thin chevron at the edge of the scene, faint
 * until the pointer finds it. No ring, no fill — drawn like the rest.
 */
function SideChevron({
  direction,
  label,
  onStep,
}: {
  direction: 1 | -1
  label: string
  onStep: (direction: 1 | -1) => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onStep(direction)}
      className={`landing-focus group absolute top-1/2 z-10 flex h-40 w-16 -translate-y-1/2 items-center justify-center text-white/20 transition-colors hover:text-accent ${
        direction === 1 ? 'right-2 sm:right-8' : 'left-2 sm:left-8'
      }`}
    >
      <svg
        viewBox="0 0 20 64"
        aria-hidden
        className={`h-16 w-5 transition-transform duration-300 ${
          direction === 1 ? 'group-hover:translate-x-1' : 'rotate-180 group-hover:-translate-x-1'
        } motion-reduce:transition-none`}
      >
        <path
          d="M3 2l14 30L3 62"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

/**
 * The dressing room as a carousel: the five lockers on a ring around you, the
 * chosen one facing you with its door open, the others receding behind it —
 * smaller, darker, softer with the distance. Turn it by dragging, with the
 * mouse wheel, the arrows, or the arrow keys (each locker is a native radio;
 * a free place cannot be chosen, but the ring can still face it).
 */
function Carousel({
  characters,
  movement,
  spin,
  focus,
  onTurnTo,
  onStep,
}: {
  characters: CharacterView[]
  movement: Record<CharacterCategory, MovementBand>
  spin: number
  focus: number
  onTurnTo: (index: number) => void
  onStep: (direction: 1 | -1) => void
}) {
  const content = useQueueContent()
  const characterContent = useCharacterContent()
  const drag = useRef<number | null>(null)
  const wheel = useRef(0)

  return (
    <fieldset
      className="queue-carousel absolute inset-0 flex touch-pan-y items-center justify-center pt-[6svh]"
      onPointerDown={(event) => {
        drag.current = event.clientX
      }}
      onPointerUp={(event) => {
        if (drag.current === null) return
        const moved = event.clientX - drag.current
        drag.current = null
        if (Math.abs(moved) > 40) onStep(moved < 0 ? 1 : -1)
      }}
      onWheel={(event) => {
        if (Math.abs(event.deltaY) < 8 || Date.now() - wheel.current < 450) return
        wheel.current = Date.now()
        onStep(event.deltaY > 0 ? 1 : -1)
      }}
    >
      <legend className="sr-only">{content.pickHeading}</legend>
      <SideChevron direction={-1} label={content.previous} onStep={onStep} />
      <SideChevron direction={1} label={content.next} onStep={onStep} />
      <h2
        id="movement"
        className="absolute left-1/2 top-[19svh] -translate-x-1/2 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-foreground-soft"
      >
        {content.movementHeading}
      </h2>
      {/* The floor under the ring: a pool of light where the front locker stands. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[72%] h-[18svh] w-[min(90vw,60rem)] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--color-accent)_14%,transparent),transparent_70%)]"
      />

      <div
        className="queue-ring relative h-[calc(var(--w)*2.1+3.25rem)] w-[var(--w)]"
        style={
          {
            '--w': 'clamp(8rem, min(19vw, 23svh), 15.5rem)',
            '--radius': 'calc(var(--w) * 2.1)',
            '--spin': `${spin}deg`,
          } as CSSProperties
        }
      >
        {CATEGORY_ORDER.map((category, index) => {
          const character = characters.find((item) => item.category === category)
          const code = characterContent.categoryCodes[category]
          const band = movement[category]
          const distance = Math.min((index - focus + 5) % 5, (focus - index + 5) % 5)
          return (
            <label
              key={category}
              className={`queue-slot queue-locker absolute inset-0 flex flex-col items-center gap-1.5 ${
                character ? 'cursor-pointer' : 'cursor-default'
              }`}
              style={
                {
                  '--i': index,
                  opacity: distance === 0 ? 1 : distance === 1 ? 0.75 : 0.4,
                  filter:
                    distance === 0
                      ? 'none'
                      : `blur(${distance}px) brightness(${1 - distance * 0.2})`,
                } as CSSProperties
              }
            >
              <input
                type="radio"
                name="character"
                value={character?.id ?? category}
                checked={character !== undefined && index === focus}
                disabled={!character}
                onChange={() => onTurnTo(index)}
                aria-label={
                  character
                    ? `${characterContent.categories[category]}: ${archetypeLabel(character.archetype)}, ${content.bands[band]}`
                    : `${characterContent.categories[category]}: ${content.noCharacterHere}, ${content.bands[band]}`
                }
                className="peer sr-only"
              />
              <span
                className={`max-w-full truncate text-xs leading-tight ${
                  character ? 'font-medium text-foreground' : 'text-foreground-soft'
                }`}
              >
                {character ? archetypeLabel(character.archetype) : code}
              </span>
              <MovementChip band={band} />
              <span
                className="w-full"
                onClick={() => {
                  // A free place cannot be chosen, but the ring still turns to it.
                  if (!character) onTurnTo(index)
                }}
              >
                <Locker
                  code={code}
                  filled={character !== undefined}
                  name={character ? archetypeLabel(character.archetype) : ''}
                  number={SHIRT_NUMBER[category]}
                />
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/**
 * A locker, as a real one: a lit interior and a door hinged on the left.
 *
 * - **taken:** the shirt hangs inside; the door stands ajar and the light
 *   leaks through the gap. Choosing it swings the door open in 3D.
 * - **free:** shut and dim, the code on its plate and nothing behind it.
 */
function Locker({
  code,
  filled,
  name = '',
  number = 0,
}: {
  code: string
  filled: boolean
  /** On the back of the shirt, when the door opens. */
  name?: string
  number?: number
}) {
  return (
    <span
      className={`queue-locker-door relative block aspect-[1/2.1] w-full ${
        filled
          ? 'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-accent'
          : ''
      }`}
    >
      {/* Inside: the back wall, the light from the top, the shirt. */}
      <span
        aria-hidden
        className="absolute inset-0 overflow-hidden rounded-t-md rounded-b-sm border border-white/10 bg-[linear-gradient(to_bottom,rgb(255_255_255/5%),rgb(0_0_0/40%))]"
      >
        {filled && (
          <>
            <span className="queue-locker-light absolute inset-0" />
            <span className="queue-hanger absolute inset-x-[6%] top-[24%] flex flex-col items-center">
              <svg viewBox="0 0 24 10" className="w-8 text-white/45">
                <path
                  d="M12 1.5a1.5 1.5 0 1 1 1.4 1.5L12 4 2 9h20L12 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                  strokeLinejoin="round"
                />
              </svg>
              <KitReveal code={code} name={name} number={number} />
            </span>
          </>
        )}
      </span>

      {/* The door. */}
      <span
        aria-hidden
        className={`queue-door absolute inset-0 flex flex-col items-center rounded-t-md rounded-b-sm border bg-[linear-gradient(160deg,#131c2e,#0a101c_70%)] shadow-[inset_0_1px_0_0_rgb(255_255_255/8%),inset_0_0_0_3px_rgb(255_255_255/2%)] ${
          filled ? 'queue-door-ajar border-white/20' : 'border-white/10'
        }`}
      >
        <span className="mt-[10%] flex w-1/2 flex-col gap-[3px]">
          {[0, 1, 2, 3].map((vent) => (
            <span key={vent} className="h-px w-full rounded-full bg-white/20" />
          ))}
        </span>
        <span
          className={`mt-[10%] rounded-sm border px-1.5 py-0.5 text-[0.55rem] font-semibold tracking-[0.15em] sm:text-[0.7rem] ${
            filled ? 'border-accent/40 text-accent' : 'border-white/10 text-foreground-soft'
          }`}
        >
          {code}
        </span>
        <span className="absolute right-[12%] top-[50%] h-[11%] w-[5%] min-w-1 rounded-full bg-white/25" />
        <span className="absolute inset-x-[14%] bottom-[8%] h-px bg-white/10" />
      </span>
    </span>
  )
}

/** The number each place wears on its back. */
const SHIRT_NUMBER: Record<CharacterCategory, number> = {
  goalkeeper: 1,
  defender: 4,
  midfielder: 8,
  winger: 11,
  striker: 9,
}

const KIT = 'M17 7l7 3 7-3 11 6-4 9-4-2v22H14V20l-4 2-4-9z'

/**
 * The kit on its hanger, two-sided. Through the gap you see the front; when
 * the door opens it turns round in 3D, the signing-day reveal: the archetype
 * arched over a big number on the back, then a slow sway on the hanger.
 */
function KitReveal({ code, name, number }: { code: string; name: string; number: number }) {
  return (
    <span className="queue-kit relative -mt-1 block aspect-square w-[78%]">
      <span className="queue-kit-turn absolute inset-0">
        {/* Front: the shirt, the check, the place. */}
        <svg
          viewBox="0 0 48 48"
          aria-hidden
          className="queue-kit-face absolute inset-0 size-full overflow-visible drop-shadow-[0_0_14px_color-mix(in_srgb,var(--color-accent)_50%,transparent)]"
        >
          <path
            d={KIT}
            strokeWidth={1.2}
            strokeLinejoin="round"
            className="fill-accent stroke-accent"
          />
          <path d="M14 13h20" strokeWidth={0.8} className="stroke-background/40" />
          <path
            d="M18.5 27l4 4 7.5-8"
            fill="none"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-background"
          />
          <text
            x="24"
            y="38.5"
            textAnchor="middle"
            fontSize="4.2"
            fontWeight={700}
            letterSpacing="0.6"
            className="fill-background/70"
          >
            {code}
          </text>
        </svg>
        {/* Back: name arched over the number. */}
        <svg
          viewBox="0 0 48 48"
          aria-hidden
          className="queue-kit-face queue-kit-back absolute inset-0 size-full overflow-visible drop-shadow-[0_0_18px_color-mix(in_srgb,var(--color-accent)_60%,transparent)]"
        >
          <defs>
            <path id={`kit-arc-${code}`} d="M15 19 Q24 14 33 19" />
          </defs>
          <path
            d={KIT}
            strokeWidth={1.2}
            strokeLinejoin="round"
            className="fill-accent stroke-accent"
          />
          <text fontSize="3.6" fontWeight={700} letterSpacing="0.4" className="fill-background">
            <textPath href={`#kit-arc-${code}`} startOffset="50%" textAnchor="middle">
              {name}
            </textPath>
          </text>
          <text
            x="24"
            y="37"
            textAnchor="middle"
            fontSize="15"
            fontWeight={800}
            className="fill-background"
          >
            {number}
          </text>
        </svg>
      </span>
    </span>
  )
}

/** How busy a place is: the word is the information, the bars agree with it. */
function MovementChip({ band }: { band: MovementBand }) {
  const content = useQueueContent()
  return (
    <span className="flex max-w-full flex-col items-center gap-1 text-center text-[0.58rem] leading-none text-foreground-soft sm:flex-row sm:gap-1.5 sm:whitespace-nowrap sm:text-[0.68rem]">
      <span aria-hidden className="flex gap-0.5">
        {[1, 2, 3].map((level) => (
          <span
            key={level}
            className={`h-1 w-2 rounded-full sm:w-2.5 ${level <= BAND_LEVEL[band] ? 'bg-accent' : 'bg-white/15'}`}
          />
        ))}
      </span>
      {content.bands[band]}
    </span>
  )
}

/**
 * The tunnel, first person. Nine arches loop from far to past the camera,
 * the floor's seams slide under you, your shirt walks ahead, and the light at
 * the end is the elo band: it grows as the band opens. On `exit` the walk
 * turns into a run and the light takes the screen.
 */
function Tunnel({
  entry,
  now,
  code,
  archetype,
  exit,
}: {
  entry: QueueEntryView
  now: number
  code: string
  archetype: string
  exit: boolean
}) {
  const content = useQueueContent()
  const waited = now - new Date(entry.joinedAt).getTime()
  const band = bandAt(waited)
  const light = 0.55 + ((band - 150) / 250) * 0.9

  return (
    <div role="status" className="queue-push-in absolute inset-0">
      <div
        data-exit={exit || undefined}
        className="queue-tunnel absolute inset-0 overflow-hidden [mask-image:radial-gradient(ellipse_72%_68%_at_50%_46%,black_58%,transparent_100%)]"
      >
        {/* The light at the end: the stadium, through the tunnel mouth. */}
        <div aria-hidden className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2">
          <span className="absolute left-1/2 top-1/2 size-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent)_22%,transparent),transparent_65%)]" />
          <span
            className="queue-end-light relative block h-16 w-20 rounded-t-[45%] rounded-b-sm bg-[radial-gradient(ellipse_at_50%_90%,#ffffff,color-mix(in_srgb,var(--color-accent)_70%,#ffffff)_45%,color-mix(in_srgb,var(--color-accent)_35%,transparent)_80%)] shadow-[0_0_60px_20px_color-mix(in_srgb,var(--color-accent)_35%,transparent)] sm:h-20 sm:w-28"
            style={{ scale: light }}
          />
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-0">
          {DUST.map((mote, index) => (
            <span
              key={index}
              className="queue-dust absolute rounded-full bg-white"
              style={
                {
                  left: `${mote.left}%`,
                  top: `${mote.top}%`,
                  width: mote.size,
                  height: mote.size,
                  '--dust-x': `${mote.drift}px`,
                  '--dust-t': `${mote.time}s`,
                  '--dust-d': `${mote.delay}s`,
                  '--dust-o': mote.size === 3 ? 0.7 : 0.45,
                } as CSSProperties
              }
            />
          ))}
        </div>

        <div aria-hidden className="queue-tunnel-world absolute inset-0">
          <div className="queue-floor absolute inset-x-[-50%] bottom-0 h-[60%]" />
          {ARCHES.map((index) => (
            <span
              key={index}
              className="queue-arch absolute left-1/2 top-[46%] aspect-[4/3] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-t-[46%] border border-b-0 border-white/20 sm:w-[64%]"
              style={{ '--i': index } as CSSProperties}
            >
              {/* Wall lamps riding each arch past you. */}
              <span className="absolute left-[6%] top-[38%] size-1.5 rounded-full bg-accent shadow-[0_0_10px_2px_color-mix(in_srgb,var(--color-accent)_60%,transparent)]" />
              <span className="absolute right-[6%] top-[38%] size-1.5 rounded-full bg-accent shadow-[0_0_10px_2px_color-mix(in_srgb,var(--color-accent)_60%,transparent)]" />
            </span>
          ))}
        </div>

        {/* You, from behind, walking towards the light. */}
        <div aria-hidden className="absolute bottom-[6%] left-1/2 -translate-x-1/2">
          <span className="absolute -bottom-1 left-1/2 h-3 w-16 -translate-x-1/2 rounded-[50%] bg-black/60 blur-[2px]" />
          <span className="queue-walker block scale-[1.6] sm:scale-[2]">
            <Shirt status="verified" code={code} />
          </span>
        </div>
      </div>

      {/* The readout, in the middle of the screen, just under the light. */}
      <div className="absolute left-1/2 top-[56%] flex -translate-x-1/2 flex-col items-center gap-1 text-center">
        <span className="font-display text-[clamp(2.4rem,1.6rem+3vw,4.5rem)] font-light leading-none tracking-[-0.035em] text-foreground tabular-nums">
          {clockOf(waited)}
        </span>
        <span className="text-sm text-foreground-soft">
          {exit ? content.placedTitle : content.searching}
        </span>
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-foreground-soft">
          {code} · {archetype}
        </span>
        <span className="mt-3 text-xs font-medium tabular-nums text-accent">
          {content.band(band)}
        </span>
        <span className="max-w-56 text-[0.7rem] leading-snug text-foreground-soft">
          {content.bandWidens}
        </span>
        <span className="sr-only">{content.waited(clockOf(waited))}</span>
      </div>
    </div>
  )
}

/** A refusal's block, counting down on its own (RF-009). */
function BlockDial({ left }: { left: number }) {
  const content = useQueueContent()
  return (
    <div role="alert" className="flex items-center gap-4">
      <span className="relative flex size-14 shrink-0 items-center justify-center rounded-full border border-danger/40">
        <svg viewBox="0 0 24 24" aria-hidden className="size-5 text-danger">
          <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </g>
        </svg>
      </span>
      <div className="flex flex-col gap-0.5">
        <p className="flex items-baseline gap-3">
          <span className="text-sm font-medium text-foreground">{content.blockedTitle}</span>
          <span className="font-display text-2xl font-light tracking-tight text-foreground tabular-nums">
            {clockOf(left)}
          </span>
        </p>
        <p className="text-xs text-foreground-soft">{content.blockedHint}</p>
        <span className="sr-only">{content.blocked(Math.ceil(left / 60_000))}</span>
      </div>
    </div>
  )
}

function RefusalMessage({ refusal }: { refusal: Refusal }) {
  const content = useQueueContent()

  if (refusal.kind === 'missing') {
    return (
      <div role="alert" className="flex flex-col gap-2.5">
        <p className="text-sm text-foreground">{content.missingHeading}</p>
        <ul className="grid gap-2 sm:grid-cols-3">
          {refusal.missing.map((item) => (
            <li key={item}>
              <a
                href={MISSING[item].href}
                {...(item === 'discord_server' ? { target: '_blank', rel: 'noreferrer' } : {})}
                className="landing-focus group flex items-center gap-3 rounded-[10px] border border-accent/25 bg-accent/5 px-3 py-2.5 text-sm text-foreground transition-colors hover:border-accent/50"
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/5 text-accent"
                  style={item.startsWith('discord') ? { color: DISCORD_BLURPLE } : undefined}
                >
                  {MISSING[item].icon}
                </span>
                {content.missing[item]}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  return (
    <p role="alert" className="text-sm text-danger">
      {refusal.kind === 'inLobby' ? content.inLobby : content.error}
    </p>
  )
}
