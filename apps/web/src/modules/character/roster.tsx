'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import type { CharacterCategory } from '@/content/character'
import { useCharacterContent } from '@/hooks/use-character-content'
import { CheckMark } from '@/common/ui/icons'
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
 * part of the picture, dashed like a slot still waiting on someone. Picking a
 * place opens its card beside the pitch.
 */
export function Roster({
  characters,
  onClaim,
  onSend,
}: {
  characters: CharacterView[]
  onClaim: (category: CharacterCategory) => void
  onSend: (characterId: string) => void
}) {
  const content = useCharacterContent()
  const byCategory = (category: CharacterCategory) =>
    characters.find((character) => character.category === category)
  const filled = CATEGORY_ORDER.filter((category) => byCategory(category)).length
  const [selected, setSelected] = useState<CharacterCategory>(() => firstToLookAt(characters))
  const current = byCategory(selected)

  return (
    <section aria-labelledby="roster-heading" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="roster-heading" className="font-display text-lg font-medium text-foreground">
          {content.roster.heading}
        </h2>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs tabular-nums text-foreground-soft">
          {content.roster.count(filled, CATEGORY_ORDER.length)}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Board characters={characters} selected={selected} onSelect={setSelected} />
        <div key={selected} className="landing-fade-up flex">
          {current ? (
            <FilledSlot character={current} onSend={onSend} />
          ) : (
            <EmptySlot category={selected} onClaim={onClaim} />
          )}
        </div>
      </div>

      <Legend />
    </section>
  )
}

/** Opens on what needs the player (a print to send), then on their own characters, then a free place. */
function firstToLookAt(characters: CharacterView[]): CharacterCategory {
  const pending = characters.find((character) => canSend(character))
  if (pending) {
    return pending.category
  }
  const own = CATEGORY_ORDER.find((category) =>
    characters.some((character) => character.category === category),
  )
  if (own) {
    return own
  }
  const free = CATEGORY_ORDER.find(
    (category) => !characters.some((character) => character.category === category),
  )
  return free ?? CATEGORY_ORDER[0]!
}

/**
 * Where each place stands, in % of the board: attacking right on a wide
 * screen, attacking up on a phone.
 */
const SPOT: Record<CharacterCategory, { h: [number, number]; v: [number, number] }> = {
  goalkeeper: { h: [10, 50], v: [50, 89] },
  defender: { h: [27, 50], v: [50, 72] },
  midfielder: { h: [48, 58], v: [42, 52] },
  winger: { h: [69, 22], v: [78, 32] },
  striker: { h: [86, 50], v: [50, 13] },
}

/** Passing lanes between the places; lit once both ends are verified. */
const LINKS: [CharacterCategory, CharacterCategory][] = [
  ['goalkeeper', 'defender'],
  ['defender', 'midfielder'],
  ['midfielder', 'winger'],
  ['midfielder', 'striker'],
  ['winger', 'striker'],
]

function Board({
  characters,
  selected,
  onSelect,
}: {
  characters: CharacterView[]
  selected: CharacterCategory
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
      <PitchLines orientation="v" statusFor={statusFor} className="sm:hidden" />
      <PitchLines orientation="h" statusFor={statusFor} className="hidden sm:block" />

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
              <Marker
                category={category}
                character={characters.find((item) => item.category === category)}
                status={statusFor(category)}
                selected={selected === category}
                onSelect={() => onSelect(category)}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** The pitch, stroke only, plus the lanes between the places. */
function PitchLines({
  orientation,
  statusFor,
  className,
}: {
  orientation: 'h' | 'v'
  statusFor: (category: CharacterCategory) => SlotStatus | 'empty'
  className: string
}) {
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
      {LINKS.map(([from, to]) => {
        const a = at(from)
        const b = at(to)
        const lit = statusFor(from) === 'verified' && statusFor(to) === 'verified'
        return (
          <line
            key={`${from}-${to}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            strokeWidth={lit ? 0.9 : 0.6}
            strokeDasharray={lit ? undefined : '2 2'}
            className={lit ? 'stroke-accent/70' : 'stroke-white/15'}
          />
        )
      })}
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

  const disc: Record<SlotStatus | 'empty', string> = {
    verified:
      'bg-accent text-background shadow-[0_0_18px_color-mix(in_srgb,var(--color-accent)_45%,transparent)]',
    review: 'border border-dashed border-accent bg-background text-accent',
    pending: 'border border-white/45 bg-background text-foreground',
    rejected: 'border border-white/45 bg-background text-foreground',
    empty:
      'border border-dashed border-white/30 bg-background/60 text-foreground-soft group-hover:border-accent/60 group-hover:text-accent',
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${content.categories[category]}: ${label}`}
      className="landing-focus group flex flex-col items-center gap-1.5 rounded-md p-1"
    >
      <span
        className={`relative flex size-11 items-center justify-center rounded-full transition-[box-shadow,border-color,color] duration-200 sm:size-12 ${disc[status]} ${
          selected ? 'ring-2 ring-accent/70 ring-offset-2 ring-offset-surface' : ''
        }`}
      >
        {status === 'verified' ? (
          <CheckMark className="size-5" />
        ) : status === 'review' ? (
          <span className="landing-slot-wait size-2.5 rounded-full bg-accent" />
        ) : status === 'empty' ? (
          <PlusMark className="size-4" />
        ) : (
          <span className="text-[0.7rem] font-semibold">{content.categoryCodes[category]}</span>
        )}
      </span>
      <span
        className={`flex flex-col items-center rounded-sm px-1.5 py-0.5 leading-tight ${
          selected ? 'bg-background/80' : ''
        }`}
      >
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-foreground-soft">
          {content.categoryCodes[category]}
        </span>
        <span
          className={`max-w-24 truncate text-xs ${character ? 'font-medium text-foreground' : 'text-foreground-soft'}`}
        >
          {label}
        </span>
      </span>
    </button>
  )
}

/** What each mark on the board means, drawn the same way. */
function Legend() {
  const content = useCharacterContent()
  const items: { mark: ReactNode; text: string }[] = [
    { mark: <span className="size-3 rounded-full bg-accent" />, text: content.existing.verified },
    {
      mark: <span className="size-3 rounded-full border border-dashed border-accent" />,
      text: content.roster.legendReview,
    },
    {
      mark: <span className="size-3 rounded-full border border-white/45" />,
      text: content.roster.legendPending,
    },
    {
      mark: <span className="size-3 rounded-full border border-dashed border-white/30" />,
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
}: {
  character: CharacterView
  onSend: (characterId: string) => void
}) {
  const content = useCharacterContent()
  const status = statusOf(character)
  const rejection =
    status === 'rejected' && character.lastPrint?.rejection
      ? (content.print.rejections[character.lastPrint.rejection] ?? content.print.genericError)
      : null

  return (
    <article
      className={`landing-card relative flex w-full flex-col gap-3 overflow-hidden rounded-md border bg-surface px-4 pb-4 pt-5 ${
        status === 'verified' ? 'border-accent/35' : 'border-white/10'
      }`}
    >
      <Brackets verified={status === 'verified'} />

      <header className="flex items-center justify-between gap-2">
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-foreground-soft">
          {content.categoryCodes[character.category]}
        </span>
        <span className="text-[0.7rem] text-foreground-soft">
          {content.platforms[character.platform]}
        </span>
      </header>

      {/* The archetype the way the game prints it — the word the player
          will photograph, so it is the loudest thing in the slot. */}
      <h3 className="font-display text-base font-medium leading-tight tracking-tight break-words text-foreground">
        {archetypeLabel(character.archetype)}
      </h3>
      <p className="sr-only">{content.categories[character.category]}</p>

      <StatusLine status={status} />
      {rejection && <p className="text-xs leading-relaxed text-danger">{rejection}</p>}

      {canSend(character) && (
        <button
          type="button"
          onClick={() => onSend(character.id)}
          className="landing-focus landing-sheen mt-auto self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-background transition-transform duration-200 hover:scale-[1.03] active:scale-95"
        >
          {status === 'rejected' ? content.existing.sendAgain : content.existing.sendPrint}
        </button>
      )}
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
      className="landing-focus group flex min-h-44 w-full flex-col items-start gap-3 rounded-md border border-dashed border-white/15 px-4 pb-4 pt-5 text-left transition-colors hover:border-accent/50"
    >
      <span className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-foreground-soft transition-colors group-hover:text-foreground">
        {content.categoryCodes[category]}
      </span>
      <p className="text-sm leading-relaxed text-foreground-soft">{content.roster.freeHint}</p>
      <span className="mt-auto flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-white/25 text-foreground-soft transition-colors group-hover:border-accent/60 group-hover:text-accent"
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
    // Waiting on moderation: the same breathing dashed ring as a queue slot
    // still waiting on its player.
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-foreground-soft">
        <span
          aria-hidden
          className="landing-slot-wait size-3.5 rounded-full border border-dashed border-accent"
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

/** Where each category stands, on a pitch drawn attacking to the right. */
const ZONE: Record<CharacterCategory, { x: number; y: number }> = {
  goalkeeper: { x: 5, y: 20 },
  defender: { x: 16, y: 20 },
  midfielder: { x: 30, y: 20 },
  winger: { x: 43, y: 8 },
  striker: { x: 52, y: 20 },
}

/**
 * The slot's place on the pitch, drawn the Quadro da Fila way: a solid disc
 * once the character is verified and in the squad, a dashed ring while it
 * still waits, a faint one for a place nobody has taken. Stroke, never fill,
 * and always quieter than the text beside it.
 */
export function PositionPitch({
  category,
  marker,
}: {
  category: CharacterCategory
  marker: 'set' | 'waiting' | 'empty'
}) {
  const { x, y } = ZONE[category]
  return (
    <svg
      viewBox="0 0 60 40"
      aria-hidden
      className="h-14 w-auto self-start text-white/20 sm:h-auto sm:w-full"
    >
      <g fill="none" stroke="currentColor" strokeWidth={0.5}>
        <rect x="1" y="1" width="58" height="38" rx="1.5" />
        <path d="M30 1v38" />
        <circle cx="30" cy="20" r="5" />
        <rect x="1" y="11" width="8" height="18" />
        <rect x="51" y="11" width="8" height="18" />
      </g>
      {marker === 'set' ? (
        <>
          <circle cx={x} cy={y} r="5" className="fill-accent/20" />
          <circle cx={x} cy={y} r="2.6" className="fill-accent" />
        </>
      ) : (
        <circle
          cx={x}
          cy={y}
          r="2.8"
          fill="none"
          strokeWidth={0.7}
          strokeDasharray="1.4 1"
          className={marker === 'waiting' ? 'stroke-accent' : 'stroke-white/40'}
        />
      )}
    </svg>
  )
}

/**
 * The corner brackets of the auth panel's readout, at slot size: the frame
 * that says "this was read and locked in". Accent once verified, faint until.
 */
function Brackets({ verified }: { verified: boolean }) {
  const corner = `pointer-events-none absolute size-2.5 ${
    verified ? 'border-accent/70' : 'border-white/25'
  }`
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      <span className={`${corner} left-1.5 top-1.5 border-l border-t`} />
      <span className={`${corner} right-1.5 top-1.5 border-r border-t`} />
      <span className={`${corner} bottom-1.5 left-1.5 border-b border-l`} />
      <span className={`${corner} bottom-1.5 right-1.5 border-b border-r`} />
    </span>
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
export function canSend(character: CharacterView): boolean {
  return character.state === 'pending_verification' && character.lastPrint?.status !== 'received'
}
