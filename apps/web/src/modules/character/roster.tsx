'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import type { CharacterCategory } from '@/content/character'
import { useCharacterContent } from '@/hooks/use-character-content'
import { CheckMark } from '@/common/ui/icons'
import { Brackets } from './pitch-art'
import { archetypeLabel, type CharacterView } from './types'

/** Goalkeeper to striker: the order the pitch reads, back to front. */
export const CATEGORY_ORDER: CharacterCategory[] = [
  'goalkeeper',
  'defender',
  'midfielder',
  'winger',
  'striker',
]

type SlotStatus = 'verified' | 'review' | 'rejected' | 'pending'

/**
 * The account's squad on a tactics board — the Quadro da Fila vocabulary on
 * the screen where the squad is built. Five places on a drawn pitch, one per
 * position category (one active character each, RF-027): an empty place is
 * part of the picture, drawn faint like a slot still waiting on someone. Picking a
 * place opens its card beside the pitch.
 */
export function Roster({
  characters,
  selected,
  onSelect,
  focusKey,
  onClaim,
  onSend,
  widget,
}: {
  characters: CharacterView[]
  /** The place picked on the pitch; kept by the flow, so it survives the print screen. */
  selected: CharacterCategory
  /** A place was picked on the pitch. */
  onSelect: (category: CharacterCategory) => void
  /** Bumped when a panel closes: focus goes back to the picked place, not to <body>. */
  focusKey: number
  /** Register a character in this place — a free one, or replacing (RF-027). */
  onClaim: (category: CharacterCategory) => void
  onSend: (characterId: string) => void
  /** Takes the side panel while open: the registration, next to its pitch. */
  widget: ReactNode
}) {
  const content = useCharacterContent()
  const sectionRef = useRef<HTMLElement>(null)
  const byCategory = (category: CharacterCategory) =>
    characters.find((character) => character.category === category)
  const filled = CATEGORY_ORDER.filter((category) => byCategory(category)).length
  const current = byCategory(selected)

  useEffect(() => {
    if (focusKey > 0) {
      sectionRef.current?.querySelector<HTMLButtonElement>(`[data-marker="${selected}"]`)?.focus()
    }
    // Only a closing panel moves focus, never a change of place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey])

  return (
    <section ref={sectionRef} aria-labelledby="roster-heading" className="flex flex-col gap-4">
      <h2 id="roster-heading" className="sr-only">
        {content.roster.heading}
      </h2>

      {/* The same columns with or without the widget: the pitch never resizes. */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3 lg:sticky lg:top-6">
          <Board
            characters={characters}
            selected={selected}
            count={content.roster.count(filled, CATEGORY_ORDER.length)}
            onSelect={onSelect}
          />
          <Legend />
        </div>
        {widget ?? (
          <div key={selected} className="landing-fade-up flex self-stretch">
            {current ? (
              <FilledSlot
                character={current}
                onSend={onSend}
                onReplace={() => onClaim(current.category)}
              />
            ) : (
              <EmptySlot category={selected} onClaim={onClaim} />
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/** Where the board opens: a print to send, else the player's first character, else the keeper. */
export function firstToLookAt(characters: CharacterView[]): CharacterCategory {
  const pending = characters.find((character) => canSend(character))
  if (pending) {
    return pending.category
  }
  return (
    CATEGORY_ORDER.find((category) =>
      characters.some((character) => character.category === category),
    ) ?? CATEGORY_ORDER[0]!
  )
}

/**
 * Where each place stands, in % of the board: attacking right on a wide
 * screen, attacking up on a phone.
 */
const SPOT: Record<CharacterCategory, { h: [number, number]; v: [number, number] }> = {
  goalkeeper: { h: [11, 46], v: [50, 89] },
  defender: { h: [28, 62], v: [50, 72] },
  midfielder: { h: [48, 50], v: [50, 50] },
  winger: { h: [69, 22], v: [78, 32] },
  striker: { h: [86, 50], v: [50, 13] },
}

/** The ball's round: build-up from the keeper, the attack, and back. */
const ROUND: CharacterCategory[] = [
  'goalkeeper',
  'defender',
  'midfielder',
  'winger',
  'striker',
  'midfielder',
  'defender',
  'goalkeeper',
]

/**
 * How each player moves about their place, in px and seconds: outfield
 * players roam their zone, the keeper barely leaves the line and moves slow.
 */
const ROAM: Record<CharacterCategory, { x: number; y: number; s: number }> = {
  goalkeeper: { x: 3, y: 7, s: 14 },
  defender: { x: 11, y: 14, s: 9 },
  midfielder: { x: 18, y: 12, s: 8 },
  winger: { x: 14, y: 18, s: 10 },
  striker: { x: 14, y: 12, s: 8.5 },
}

function Board({
  characters,
  selected,
  count,
  onSelect,
}: {
  characters: CharacterView[]
  selected: CharacterCategory
  /** "4/5 vagas", read off the pitch like a match HUD. */
  count: string
  onSelect: (category: CharacterCategory) => void
}) {
  const statusFor = (category: CharacterCategory): SlotStatus | 'empty' => {
    const character = characters.find((item) => item.category === category)
    return character ? statusOf(character) : 'empty'
  }

  return (
    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-white/10 bg-surface shadow-[inset_0_1px_0_0_rgb(255_255_255/6%)] sm:aspect-[16/10]">
      {/* Mowing stripes: the one texture that says "grass" without a photo. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgb(255_255_255/2.5%)_0_10%,transparent_10%_20%)] sm:bg-[repeating-linear-gradient(90deg,rgb(255_255_255/2.5%)_0_10%,transparent_10%_20%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,color-mix(in_srgb,var(--color-accent-strong)_22%,transparent),transparent_75%)]"
      />
      <div
        aria-hidden
        className="landing-pitch-scan pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-accent/[0.07] to-transparent"
      />
      <span className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-background/70 px-2.5 py-1 text-xs tabular-nums text-foreground-soft">
        {count}
      </span>
      <PitchLines orientation="v" className="sm:hidden" />
      <PitchLines orientation="h" className="hidden sm:block" />

      <ol className="absolute inset-0">
        {CATEGORY_ORDER.map((category, index) => (
          <li
            key={category}
            className="absolute left-[var(--v-x)] top-[var(--v-y)] -translate-x-1/2 -translate-y-1/2 sm:left-[var(--h-x)] sm:top-[var(--h-y)]"
            style={
              {
                '--v-x': `${SPOT[category].v[0]}%`,
                '--v-y': `${SPOT[category].v[1]}%`,
                '--h-x': `${SPOT[category].h[0]}%`,
                '--h-y': `${SPOT[category].h[1]}%`,
                '--landing-delay': `${index * 70}ms`,
              } as CSSProperties
            }
          >
            <div className="landing-fade-up">
              <div
                className="board-roam"
                data-selected={selected === category || undefined}
                style={
                  {
                    '--roam-x': `${ROAM[category].x}px`,
                    '--roam-y': `${ROAM[category].y}px`,
                    '--roam-time': `${ROAM[category].s}s`,
                    '--roam-delay': `${-index * 1.7}s`,
                  } as CSSProperties
                }
              >
                <Marker
                  category={category}
                  character={characters.find((item) => item.category === category)}
                  status={statusFor(category)}
                  selected={selected === category}
                  onSelect={() => onSelect(category)}
                />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** The pitch, stroke only, and the ball. */
function PitchLines({ orientation, className }: { orientation: 'h' | 'v'; className: string }) {
  const horizontal = orientation === 'h'
  const [w, h] = horizontal ? [160, 100] : [100, 150]
  const at = (category: CharacterCategory) => {
    const [x, y] = SPOT[category][orientation]
    return { x: (x / 100) * w, y: (y / 100) * h }
  }

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
      className={`absolute inset-0 size-full ${className}`}
    >
      <g fill="none" stroke="rgb(255 255 255 / 16%)" strokeWidth={0.5}>
        <rect x="4" y="4" width={w - 8} height={h - 8} rx="2" />
        {horizontal ? (
          <>
            <path d={`M${w / 2} 4v${h - 8}`} />
            <rect x="4" y={h / 2 - 22} width="22" height="44" />
            <rect x={w - 26} y={h / 2 - 22} width="22" height="44" />
            <rect x="4" y={h / 2 - 10} width="8" height="20" />
            <rect x={w - 12} y={h / 2 - 10} width="8" height="20" />
          </>
        ) : (
          <>
            <path d={`M4 ${h / 2}h${w - 8}`} />
            <rect x={w / 2 - 22} y={h - 26} width="44" height="22" />
            <rect x={w / 2 - 22} y="4" width="44" height="22" />
            <rect x={w / 2 - 10} y={h - 12} width="20" height="8" />
            <rect x={w / 2 - 10} y="4" width="20" height="8" />
          </>
        )}
        <circle cx={w / 2} cy={h / 2} r="12" />
      </g>
      {/* The ball does the rounds from the keeper to the attack and home
          again, on a route nobody draws. Gone under reduced motion. */}
      <g className="board-ball">
        <circle r="1.9" className="fill-foreground">
          <animateMotion
            dur="11s"
            repeatCount="indefinite"
            path={ROUND.map(
              (category, i) => `${i ? 'L' : 'M'}${at(category).x} ${at(category).y}`,
            ).join(' ')}
          />
        </circle>
      </g>
    </svg>
  )
}

function Marker({
  category,
  character,
  status,
  selected,
  onSelect,
}: {
  category: CharacterCategory
  character?: CharacterView
  status: SlotStatus | 'empty'
  selected: boolean
  onSelect: () => void
}) {
  const content = useCharacterContent()
  const label = character ? archetypeLabel(character.archetype) : content.roster.free
  const state: Record<SlotStatus | 'empty', string> = {
    verified: content.existing.verified,
    review: content.roster.legendReview,
    pending: content.roster.legendPending,
    rejected: content.existing.rejectedShort,
    empty: '',
  }
  const name = state[status]
    ? `${content.categories[category]}: ${label}, ${state[status]}`
    : `${content.categories[category]}: ${label}`

  return (
    <button
      type="button"
      onClick={onSelect}
      data-marker={category}
      aria-pressed={selected}
      aria-label={name}
      className="landing-focus group flex flex-col items-center gap-1 rounded-md p-1"
    >
      <span className="relative flex flex-col items-center">
        {/* The player stands on a spot of light: lit and pulsing when picked,
            a faint shadow otherwise — the game's own "this one" marker. */}
        <span
          aria-hidden
          className={`absolute -bottom-1 h-2.5 w-12 rounded-[50%] transition-colors ${
            selected ? 'board-spot bg-accent/45' : 'bg-black/50'
          }`}
        />
        <span className="relative block">
          <Shirt status={status} code={content.categoryCodes[category]} />
        </span>
      </span>
      <span
        className={`max-w-32 truncate rounded-sm px-1.5 py-0.5 text-xs leading-tight ${
          character ? 'font-medium text-foreground' : 'text-foreground-soft'
        } ${selected ? 'bg-background/80' : ''}`}
      >
        {label}
      </span>
    </button>
  )
}

const SHIRT = 'M17 7l7 3 7-3 11 6-4 9-4-2v22H14V20l-4 2-4-9z'

/** A drawn shirt, in the state of its place — the Quadro da Fila marks on a kit. */
function Shirt({ status, code }: { status: SlotStatus | 'empty'; code: string }) {
  const body: Record<SlotStatus | 'empty', string> = {
    verified: 'fill-accent stroke-accent',
    review: 'fill-background stroke-accent',
    pending: 'fill-background stroke-white/55',
    rejected: 'fill-background stroke-danger',
    empty: 'fill-background/40 stroke-white/25 group-hover:stroke-accent/70',
  }
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden
      className={`size-12 overflow-visible transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 sm:size-14 ${
        status === 'verified'
          ? 'drop-shadow-[0_0_10px_color-mix(in_srgb,var(--color-accent)_55%,transparent)]'
          : ''
      }`}
    >
      <path
        d={SHIRT}
        strokeWidth={1.4}
        strokeLinejoin="round"
        className={`transition-colors ${body[status]}`}
      />
      {status === 'verified' && (
        <path
          d="M18.5 27l4 4 7.5-8"
          fill="none"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-background"
        />
      )}
      {status === 'review' && (
        <circle cx="24" cy="27" r="3.2" className="landing-slot-wait fill-accent" />
      )}
      {(status === 'pending' || status === 'rejected') && (
        <text
          x="24"
          y="30.5"
          textAnchor="middle"
          fontSize="9"
          fontWeight={600}
          className="fill-foreground"
        >
          {code}
        </text>
      )}
      {status === 'empty' && (
        <path
          d="M24 22v10M19 27h10"
          strokeWidth={1.6}
          strokeLinecap="round"
          className="stroke-foreground-soft transition-colors group-hover:stroke-accent"
        />
      )}
    </svg>
  )
}

/** What each mark on the board means, drawn the same way. */
function Legend() {
  const content = useCharacterContent()
  const items: { mark: ReactNode; text: string }[] = [
    { mark: <span className="size-3 rounded-full bg-accent" />, text: content.existing.verified },
    {
      mark: (
        <span className="flex size-3 items-center justify-center rounded-full border border-accent">
          <span className="size-1 rounded-full bg-accent" />
        </span>
      ),
      text: content.roster.legendReview,
    },
    {
      mark: <span className="size-3 rounded-full border border-white/45" />,
      text: content.roster.legendPending,
    },
    {
      mark: <span className="size-3 rounded-full border border-danger" />,
      text: content.existing.rejectedShort,
    },
    {
      mark: <span className="size-3 rounded-full border border-white/20" />,
      text: content.roster.free,
    },
  ]
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground-soft">
      {items.map((item) => (
        <li key={item.text} className="inline-flex items-center gap-2">
          <span aria-hidden className="flex">
            {item.mark}
          </span>
          {item.text}
        </li>
      ))}
    </ul>
  )
}

function FilledSlot({
  character,
  onSend,
  onReplace,
}: {
  character: CharacterView
  onSend: (characterId: string) => void
  onReplace: () => void
}) {
  const content = useCharacterContent()
  const status = statusOf(character)
  const rejection =
    status === 'rejected' && character.lastPrint?.rejection
      ? (content.print.rejections[character.lastPrint.rejection] ?? content.print.genericError)
      : null

  return (
    <article
      className={`relative flex w-full flex-col gap-3 overflow-hidden rounded-md border bg-surface px-4 pb-4 pt-5 shadow-[inset_0_1px_0_0_rgb(255_255_255/6%)] ${
        status === 'verified' ? 'border-accent/35' : 'border-white/10'
      }`}
    >
      <Brackets lit={status === 'verified'} />

      <header className="flex items-center justify-between gap-2">
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-foreground-soft">
          {content.categoryCodes[character.category]}
        </span>
        <span className="text-[0.7rem] text-foreground-soft">
          {content.platforms[character.platform]}
        </span>
      </header>

      <ProFigure status={status} />

      {/* The archetype the way the game prints it — the word the player
          will photograph, so it is the loudest thing in the slot. */}
      <h3 className="font-display text-base font-medium leading-tight tracking-tight break-words text-foreground">
        {archetypeLabel(character.archetype)}
      </h3>
      <p className="sr-only">{content.categories[character.category]}</p>

      <StatusLine status={status} />
      {rejection && <p className="text-xs leading-relaxed text-danger">{rejection}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        {canSend(character) && (
          <button
            type="button"
            onClick={() => onSend(character.id)}
            className="landing-focus landing-sheen rounded-full bg-accent px-4 py-2 text-sm font-medium text-background transition-transform duration-200 hover:scale-[1.03] active:scale-95"
          >
            {status === 'rejected' ? content.existing.sendAgain : content.existing.sendPrint}
          </button>
        )}
        <button
          type="button"
          onClick={onReplace}
          className="landing-focus inline-flex items-center gap-2 rounded-full py-2 text-sm text-foreground-soft transition-colors hover:text-foreground"
        >
          <SwapMark className="size-4" />
          {content.roster.replace}
        </button>
      </div>
    </article>
  )
}

function EmptySlot({
  category,
  onClaim,
}: {
  category: CharacterCategory
  onClaim: (category: CharacterCategory) => void
}) {
  const content = useCharacterContent()

  return (
    <button
      type="button"
      onClick={() => onClaim(category)}
      className="landing-focus group flex min-h-44 w-full flex-col items-start gap-3 rounded-md border border-white/10 bg-white/[0.015] px-4 pb-4 pt-5 text-left transition-colors hover:border-accent/50"
    >
      <span className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-foreground-soft transition-colors group-hover:text-foreground">
        {content.categoryCodes[category]}
      </span>
      <ProFigure status="empty" />
      <span className="mt-auto flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/20 text-foreground-soft transition-colors group-hover:border-accent/60 group-hover:text-accent"
        >
          <PlusMark className="size-3.5" />
        </span>
        <span className="flex flex-col">
          <span className="text-sm text-foreground transition-colors group-hover:text-accent">
            {content.roster.claim}
          </span>
          <span className="text-xs text-foreground-soft">{content.categories[category]}</span>
        </span>
      </span>
    </button>
  )
}

function StatusLine({ status }: { status: SlotStatus }) {
  const content = useCharacterContent()

  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
        <span className="flex size-4 items-center justify-center rounded-full bg-accent/20">
          <CheckMark className="size-3" />
        </span>
        {content.existing.verified}
      </span>
    )
  }
  if (status === 'review') {
    // Waiting on moderation: the same breathing ring as a queue slot
    // still waiting on its player.
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-foreground-soft">
        <span
          aria-hidden
          className="landing-slot-wait flex size-3.5 items-center justify-center rounded-full border border-accent"
        />
        {content.existing.inReview}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-foreground-soft">
      <span aria-hidden className="size-3 rounded-full border border-white/25" />
      {status === 'rejected' ? content.existing.rejectedShort : content.existing.pending}
    </span>
  )
}

/**
 * The Pro, drawn: a head and a kit over a spot of light — the card art the
 * game would show, without the game's art. Lit green once verified, faint
 * while the place waits on someone.
 */
function ProFigure({ status }: { status: SlotStatus | 'empty' }) {
  const lit = status === 'verified'
  const waiting = status === 'empty' || status === 'review'
  const line = lit ? 'stroke-accent' : waiting ? 'stroke-white/25' : 'stroke-white/55'
  return (
    <svg viewBox="0 0 120 84" aria-hidden className="my-2 h-28 w-full">
      <ellipse
        cx="60"
        cy="76"
        rx="30"
        ry="5"
        className={lit ? 'board-spot fill-accent/30' : 'fill-white/[0.05]'}
      />
      <g
        fill="none"
        strokeWidth={1.4}
        strokeLinejoin="round"
        className={`${line} ${lit ? 'drop-shadow-[0_0_12px_color-mix(in_srgb,var(--color-accent)_45%,transparent)]' : ''}`}
      >
        <circle cx="60" cy="18" r="10" className={lit ? 'fill-accent/15' : ''} />
        <path
          d="M44 34l16 5 16-5 16 9-6 12-7-3v22H41V52l-7 3-6-12z"
          className={lit ? 'fill-accent/15' : ''}
        />
      </g>
    </svg>
  )
}

function SwapMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M7 7h11l-3-3M17 17H6l3 3" />
    </svg>
  )
}

function PlusMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden
      className={className}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function statusOf(character: CharacterView): SlotStatus {
  if (character.state === 'verified') {
    return 'verified'
  }
  if (character.lastPrint?.status === 'received') {
    return 'review'
  }
  if (character.lastPrint?.status === 'rejected') {
    return 'rejected'
  }
  return 'pending'
}

/** A print already under review is not sent again; a rejected one can be. */
function canSend(character: CharacterView): boolean {
  return character.state === 'pending_verification' && character.lastPrint?.status !== 'received'
}
