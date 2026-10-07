'use client'

import Link from 'next/link'
import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from 'react'
import { DISCORD_INVITE_URL } from '@/common/discord/invite'
import { BackAction } from '@/common/ui/back-action'
import { DISCORD_BLURPLE, DiscordMark, MailMark, PlayerCardMark } from '@/common/ui/icons'
import type { CharacterCategory } from '@/content/character'
import type { MissingPrerequisite, MovementBand } from '@/content/queue'
import { useCharacterContent } from '@/hooks/use-character-content'
import { useQueueContent } from '@/hooks/use-queue-content'
import { ReputationGauge, type ReputationBand } from '@/modules/account/reputation-gauge'
import { Brackets } from '@/modules/character/pitch-art'
import { CATEGORY_ORDER, Shirt } from '@/modules/character/roster'
import { archetypeLabel, type CharacterView } from '@/modules/character/types'

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

const POLL_MS = 5000
const BAND_LEVEL: Record<MovementBand, number> = { low: 1, busy: 2, full: 3 }
const ARCHES = Array.from({ length: 9 }, (_, index) => index)

/** The arc of lockers around you: how far each one turns in and comes close. */
const ARC = [
  { turn: '24deg', near: '48px' },
  { turn: '12deg', near: '14px' },
  { turn: '0deg', near: '0px' },
  { turn: '-12deg', near: '14px' },
  { turn: '-24deg', near: '48px' },
]

/** RF-003, drawn: ±150, +50 every 2 min of search, ±400 at most. */
function bandAt(waitedMs: number): number {
  return Math.min(150 + 50 * Math.floor(waitedMs / 120_000), 400)
}

const PRIMARY =
  'landing-focus landing-sheen inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background shadow-[0_8px_20px_rgb(0_0_0/25%)] transition-transform duration-200 hover:scale-[1.04] active:scale-95 disabled:opacity-50 disabled:hover:scale-100'

const MISSING: Record<MissingPrerequisite, { href: string; icon: React.ReactNode }> = {
  email: { href: '/verifications', icon: <MailMark className="size-4" /> },
  character: { href: '/account/character', icon: <PlayerCardMark className="size-4" /> },
  discord: { href: '/account/discord', icon: <DiscordMark className="size-4" /> },
  discord_server: { href: DISCORD_INVITE_URL, icon: <DiscordMark className="size-4" /> },
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

const clockOf = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
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
  const [picked, setPicked] = useState(verified[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [refusal, setRefusal] = useState<Refusal | null>(null)
  const now = useNow(state.entry !== null || state.blockedUntil !== null)

  const blockedLeft = state.blockedUntil ? new Date(state.blockedUntil).getTime() - now : 0
  const blocked = blockedLeft > 0
  const chosen = verified.find((character) => character.id === picked)
  const walking = characters.find((character) => character.id === state.entry?.characterId)

  // While in the queue, ask again every few seconds: the lobby arrives on its own.
  const inQueue = state.entry !== null
  useEffect(() => {
    if (!inQueue) return
    const timer = setInterval(async () => {
      try {
        const response = await fetch('/bff/queue')
        if (response.ok) setState((await response.json()) as QueueState)
      } catch {
        // A missed poll is not news; the next one tries again.
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [inQueue])

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
        setState({ entry: body as unknown as QueueEntryView, blockedUntil: null })
      } else if (body.message === 'queue_prerequisites_missing' && body.missing) {
        setRefusal({ kind: 'missing', missing: body.missing })
      } else if (body.message === 'queue_blocked') {
        const until =
          body.blockedUntil ??
          new Date(Date.now() + (body.retryAfterSeconds ?? 60) * 1000).toISOString()
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

  const scene = state.entry ? (state.entry.lobby ? 'found' : 'searching') : 'picking'
  const look = useLook()

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex items-center gap-4">
        <BackAction href="/verifications" label={content.back} />
        <h1 className="font-display text-[clamp(1.65rem,1.1rem+1.7vw,2.4rem)] font-light leading-none tracking-[-0.028em] text-foreground">
          {content.title}
        </h1>
      </div>

      <div className="flex flex-col">
        <section {...look} className="relative">
          {state.entry ? (
            <Tunnel
              entry={state.entry}
              now={now}
              code={codes[state.entry.category]}
              archetype={walking ? archetypeLabel(walking.archetype) : codes[state.entry.category]}
              exit={scene === 'found'}
              reputation={<ReputationGauge inline reputation={reputation} band={reputationBand} />}
            />
          ) : (
            <DressingRoom
              characters={verified}
              movement={movement}
              picked={picked}
              onPick={setPicked}
              reputation={<ReputationGauge inline reputation={reputation} band={reputationBand} />}
            />
          )}

          <div className="flex flex-col gap-3">
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
                  {chosen && (
                    <p className="flex items-baseline gap-2 text-sm text-foreground-soft">
                      <span className="font-display text-lg font-medium tracking-tight text-foreground">
                        {archetypeLabel(chosen.archetype)}
                      </span>
                      <span className="tabular-nums">Elo {chosen.elo}</span>
                    </p>
                  )}
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
              ))}

            {scene === 'searching' && (
              <BackAction kind="cancel" onClick={leave} label={content.leave} />
            )}
            {scene === 'found' && (
              <p className="text-sm text-foreground-soft">{content.placedHint}</p>
            )}

            {refusal && <RefusalMessage refusal={refusal} />}
          </div>
        </section>

        {state.entry?.lobby && (
          <MatchFound
            lobby={state.entry.lobby}
            now={now}
            code={codes[state.entry.category]}
            onAnswered={(next) => setState(next)}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Choosing who to play as: one locker per place. Each locker is a native radio
 * (arrow keys move between them); an empty place is a closed door that cannot
 * be chosen. The plate under each locker says how busy that place is.
 */
function DressingRoom({
  characters,
  movement,
  picked,
  onPick,
  reputation,
}: {
  characters: CharacterView[]
  movement: Record<CharacterCategory, MovementBand>
  picked: string
  onPick: (id: string) => void
  /** Hung on the dressing room wall, above the lockers. */
  reputation: React.ReactNode
}) {
  const content = useQueueContent()
  const characterContent = useCharacterContent()

  return (
    <fieldset className="relative pb-2">
      <legend className="sr-only">{content.pickHeading}</legend>
      {/* The wall: the reputation dial hung like the dressing room clock. */}
      <div className="relative mb-3 flex flex-wrap items-center justify-between gap-4 sm:mb-4">
        <h2
          id="movement"
          className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-foreground-soft"
        >
          {content.movementHeading}
        </h2>
        {reputation}
      </div>

      {/* The ceiling strip lighting the row from above. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[8%] top-[18%] h-[60%] bg-[radial-gradient(ellipse_50%_40%_at_50%_0%,color-mix(in_srgb,var(--color-accent)_10%,transparent),transparent_75%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none mx-auto mb-4 h-px w-[70%] bg-gradient-to-r from-transparent via-white/30 to-transparent shadow-[0_0_18px_2px_rgb(255_255_255/12%)]"
      />
      <div className="queue-lockers relative grid grid-cols-5 gap-2 pb-[clamp(2.5rem,9svh,5rem)] sm:gap-6">
        {CATEGORY_ORDER.map((category, index) => {
          const character = characters.find((item) => item.category === category)
          const code = characterContent.categoryCodes[category]
          const band = movement[category]
          return (
            <label
              key={category}
              className={`queue-locker landing-fade-up group flex min-w-0 flex-col items-center gap-2 ${
                character ? 'cursor-pointer' : 'cursor-default'
              }`}
              style={
                {
                  '--landing-delay': `${index * 80}ms`,
                  '--turn': ARC[index]!.turn,
                  '--near': ARC[index]!.near,
                } as CSSProperties
              }
            >
              <input
                type="radio"
                name="character"
                value={character?.id ?? category}
                checked={character !== undefined && character.id === picked}
                disabled={!character}
                onChange={() => character && onPick(character.id)}
                aria-label={
                  character
                    ? `${characterContent.categories[category]}: ${archetypeLabel(character.archetype)}, ${content.bands[band]}`
                    : `${characterContent.categories[category]}: ${content.noCharacterHere}, ${content.bands[band]}`
                }
                className="peer sr-only"
              />
              <span
                className={`max-w-full truncate text-[0.68rem] leading-tight sm:text-xs ${
                  character ? 'font-medium text-foreground' : 'text-foreground-soft'
                }`}
              >
                {character ? archetypeLabel(character.archetype) : code}
              </span>
              <MovementChip band={band} />
              <Locker code={code} filled={character !== undefined} />
            </label>
          )
        })}
      </div>
      {/* The bench in front of the lockers. */}
      <div aria-hidden className="relative mx-auto -mt-[clamp(2rem,7svh,4rem)] w-[92%]">
        <div className="h-2 rounded-sm border-t border-white/15 bg-gradient-to-b from-white/[0.06] to-transparent" />
        <div className="mx-[6%] flex justify-between">
          <span className="h-3 w-px bg-white/10" />
          <span className="h-3 w-px bg-white/10" />
        </div>
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
function Locker({ code, filled }: { code: string; filled: boolean }) {
  return (
    <span
      className={`queue-locker-door relative block aspect-[1/2.1] w-full sm:h-[clamp(10rem,34svh,17rem)] sm:w-auto ${
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
            <span className="queue-hanger absolute inset-x-0 top-[14%] flex flex-col items-center">
              <svg viewBox="0 0 24 10" className="w-7 text-white/45">
                <path
                  d="M12 1.5a1.5 1.5 0 1 1 1.4 1.5L12 4 2 9h20L12 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                  strokeLinejoin="round"
                />
              </svg>
              <span className="-mt-1 scale-100 sm:scale-125">
                <Shirt status="verified" code={code} />
              </span>
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
  reputation,
}: {
  entry: QueueEntryView
  now: number
  code: string
  archetype: string
  exit: boolean
  reputation: React.ReactNode
}) {
  const content = useQueueContent()
  const waited = now - new Date(entry.joinedAt).getTime()
  const band = bandAt(waited)
  const light = 0.55 + ((band - 150) / 250) * 0.9

  return (
    <div
      role="status"
      className="queue-push-in relative aspect-[3/4] max-h-[62svh] w-full sm:aspect-[16/9]"
    >
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

      <div className="absolute left-4 top-4 flex flex-col gap-1">
        <span className="font-display text-[clamp(2rem,1.4rem+2.2vw,3.2rem)] font-light leading-none tracking-[-0.03em] text-foreground tabular-nums">
          {clockOf(waited)}
        </span>
        <span className="text-sm text-foreground-soft">
          {exit ? content.placedTitle : content.searching}
        </span>
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-foreground-soft">
          {code} · {archetype}
        </span>
        <span className="sr-only">{content.waited(clockOf(waited))}</span>
      </div>
      <div className="absolute right-4 top-4 flex flex-col items-end gap-1 text-right">
        <span className="text-xs font-medium tabular-nums text-accent">{content.band(band)}</span>
        <span className="hidden max-w-44 text-[0.7rem] leading-snug text-foreground-soft sm:block">
          {content.bandWidens}
        </span>
      </div>
      <div className="absolute bottom-4 right-4 hidden sm:block">{reputation}</div>
    </div>
  )
}

/** The floodlights over the pitch: four beams from the stand roofs. */
const BEAMS = [
  { left: '6%', from: '-26deg', to: '-14deg', delay: '0s' },
  { left: '30%', from: '-10deg', to: '-2deg', delay: '0.12s' },
  { left: '70%', from: '10deg', to: '2deg', delay: '0.24s' },
  { left: '94%', from: '26deg', to: '14deg', delay: '0.36s' },
]

/**
 * Match found — out of the tunnel and onto the pitch. Over everything: the
 * floodlights come on one after another, the pitch glows under them, and the
 * card rises with the 30 s ring draining around the seconds and the two
 * answers (#232's `PUT /queue/confirmation`). Accepting keeps the card up,
 * confirmed; refusing reloads the queue state, which now carries the block.
 */
function MatchFound({
  lobby,
  now,
  code,
  onAnswered,
}: {
  lobby: NonNullable<QueueEntryView['lobby']>
  now: number
  code: string
  onAnswered: (state: QueueState) => void
}) {
  const content = useQueueContent()
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const left = Math.max(0, Math.ceil((new Date(lobby.confirmBy).getTime() - now) / 1000))
  const share = Math.min(1, left / 30)
  const closed = left === 0

  async function answer(accept: boolean) {
    setSending(true)
    setFailed(null)
    try {
      const response = await fetch('/bff/queue/confirmation', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accept }),
      })
      if (!response.ok) {
        setFailed(response.status === 409 ? content.answerClosed : content.error)
        return
      }
      const state = await fetch('/bff/queue')
      if (state.ok) onAnswered((await state.json()) as QueueState)
    } catch {
      setFailed(content.error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-found"
      className="queue-overlay fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-background/85 px-4 backdrop-blur-sm"
    >
      {/* The stadium: the pitch glowing under the lights, and the beams. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_80%_70%_at_50%_100%,color-mix(in_srgb,var(--color-accent-strong)_45%,transparent),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-[repeating-linear-gradient(90deg,rgb(255_255_255/3%)_0_8%,transparent_8%_16%)] [mask-image:linear-gradient(to_top,black,transparent)]"
      />
      {BEAMS.map((beam) => (
        <span
          key={beam.left}
          aria-hidden
          className="queue-beam pointer-events-none absolute -top-4 h-[85vh] w-[22vw] max-w-72 -translate-x-1/2 bg-[linear-gradient(to_bottom,rgb(255_255_255/38%),transparent_85%)] [clip-path:polygon(44%_0,56%_0,100%_100%,0_100%)]"
          style={
            {
              left: beam.left,
              '--beam-from': beam.from,
              '--beam-to': beam.to,
              animationDelay: `${beam.delay}, calc(1.6s + ${beam.delay})`,
            } as CSSProperties
          }
        />
      ))}

      <div className="queue-card-rise relative w-full max-w-sm">
        <div>
          <div className="relative flex flex-col items-center gap-5 px-6 pb-6 pt-8 text-center">
            <Brackets lit />
            <h2
              id="match-found"
              className="font-display text-[clamp(1.65rem,1.1rem+1.7vw,2.4rem)] font-light leading-tight tracking-[-0.028em] text-foreground"
            >
              {content.placedTitle}
            </h2>

            <div className="relative size-36">
              <svg
                viewBox="0 0 120 120"
                aria-hidden
                className="absolute inset-0 size-full -rotate-90"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="rgb(255 255 255 / 8%)"
                  strokeWidth={5}
                />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={5}
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray={`${share * 100} 100`}
                  className="transition-[stroke-dasharray] duration-1000 ease-linear"
                />
              </svg>
              <svg
                viewBox="0 0 120 120"
                aria-hidden
                className="queue-ring-3d absolute inset-0 size-full"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="44"
                  fill="none"
                  stroke="rgb(255 255 255 / 18%)"
                  strokeWidth={0.8}
                  strokeDasharray="2 6"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-5xl font-light leading-none tracking-[-0.03em] text-foreground tabular-nums">
                  {left}
                </span>
                <span className="mt-1 text-xs text-foreground-soft">{content.secondsLeft}</span>
              </div>
            </div>

            <p className="flex items-center gap-2 text-sm text-foreground-soft">
              <span className="text-xs font-semibold tracking-[0.15em] text-accent">{code}</span>
              {lobby.confirmed ? content.confirmed : content.placedHint}
            </p>

            {!lobby.confirmed && (
              <div className="flex w-full flex-col gap-3 sm:flex-row-reverse">
                <button
                  type="button"
                  autoFocus
                  onClick={() => answer(true)}
                  disabled={sending || closed}
                  className={`${PRIMARY} flex-1 py-3 text-base`}
                >
                  {content.accept}
                </button>
                <button
                  type="button"
                  onClick={() => answer(false)}
                  disabled={sending || closed}
                  className="landing-focus flex-1 rounded-full border border-white/15 px-5 py-3 text-base text-foreground-soft transition-colors hover:border-white/35 hover:text-foreground disabled:opacity-50"
                >
                  {content.refuse}
                </button>
              </div>
            )}
            {failed && (
              <p role="alert" className="text-sm text-danger">
                {failed}
              </p>
            )}
          </div>
        </div>
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
