'use client'

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
 * The account's five slots as a squad sheet — the Quadro da Fila vocabulary
 * on the screen where the squad is built. One slot per position category
 * (one active character each, RF-027), so an empty slot is part of the
 * picture, drawn dashed like a place still waiting on someone, and not an
 * absence the player has to infer.
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
  const filled = CATEGORY_ORDER.filter((category) =>
    characters.some((character) => character.category === category),
  ).length

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

      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        {CATEGORY_ORDER.map((category) => {
          const character = characters.find((item) => item.category === category)
          return (
            <li key={category} className="flex">
              {character ? (
                <FilledSlot character={character} onSend={onSend} />
              ) : (
                <EmptySlot category={category} onClaim={onClaim} />
              )}
            </li>
          )
        })}
      </ol>
    </section>
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

      <PositionPitch
        category={character.category}
        marker={status === 'verified' ? 'set' : status === 'review' ? 'waiting' : 'empty'}
      />

      {/* The archetype the way the game prints it — the word the player
          will photograph, so it is the loudest thing in the slot. */}
      <p className="font-display text-base font-medium leading-tight tracking-tight break-words text-foreground">
        {archetypeLabel(character.archetype)}
      </p>
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
      className="landing-focus group flex w-full flex-col items-start gap-3 rounded-md border border-dashed border-white/15 px-4 pb-4 pt-5 text-left transition-colors hover:border-accent/50 sm:min-h-44"
    >
      <span className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-foreground-soft transition-colors group-hover:text-foreground">
        {content.categoryCodes[category]}
      </span>
      <PositionPitch category={category} marker="empty" />
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
