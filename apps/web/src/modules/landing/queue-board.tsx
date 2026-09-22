'use client'

import { useLandingContent } from '@/hooks/use-landing-content'

/**
 * The queue board: eleven slots on a pitch, filling up.
 *
 * Built to the lineup format the team already shipped in
 * `escalacao-brasileirao` (docs/assets/demo-campo.png), which the user pointed
 * at as the shape the Fase 2.5 queue screen should take — pitch on the left,
 * roster grouped by category on the right, counters underneath.
 *
 * **Redrawn rather than embedded.** That PNG is a capture of a different
 * product, down to real footballers' names and club crests; dropped onto this
 * page it would read as a screenshot of ProLobby showing data ProLobby does
 * not have. So the format is reused and the content is ours: the five position
 * categories, eleven slots, some confirmed and some still waiting.
 *
 * It is labelled an example in the UI, not only in this comment. The queue is
 * Fase 2.5 — nothing here is live, and a mock that does not say so is a lie
 * with good manners.
 */

/**
 * The eleven slots, as a 4-3-3 mapped onto the five categories the platform
 * actually has (`docs/produto/02-jogador/02-ranking.md`): four at the back all
 * count as zaga, three in midfield, two wide, one up front.
 *
 * `x`/`y` are percentages of the pitch box, attacking upward. `category` is an
 * index into the translated list, so the geometry survives translation.
 */
const SLOTS = [
  { x: 50, y: 90, category: 0 },
  { x: 16, y: 71, category: 1 },
  { x: 39, y: 76, category: 1 },
  { x: 61, y: 76, category: 1 },
  { x: 84, y: 71, category: 1 },
  { x: 27, y: 52, category: 2 },
  { x: 50, y: 47, category: 2 },
  { x: 73, y: 52, category: 2 },
  { x: 15, y: 27, category: 3 },
  { x: 85, y: 27, category: 3 },
  { x: 50, y: 20, category: 4 },
] as const

/** Which slots are still open in the example. Two, so the board reads as mid-fill. */
const WAITING = new Set([4, 8])

export function QueueBoard() {
  const content = useLandingContent()
  const categories = content.positions.items
  const board = content.queueBoard

  const perCategory = categories.map((label, category) => {
    const slots = SLOTS.map((slot, index) => ({ slot, index })).filter(
      (entry) => entry.slot.category === category,
    )
    return {
      label,
      total: slots.length,
      filled: slots.filter((entry) => !WAITING.has(entry.index)).length,
    }
  })

  return (
    <div className="landing-halo rounded-lg shadow-default">
      <div className="landing-halo-surface overflow-hidden rounded-lg border border-white/10 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-foreground-soft">
            {board.title}
          </span>
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[0.7rem] text-foreground-soft">
            {board.formation}
          </span>
        </div>

        <div aria-hidden className="landing-rule my-4" />

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative aspect-[3/4] w-full sm:w-1/2">
            <Pitch />
            {SLOTS.map((slot, index) => (
              <Token
                key={`${slot.x}-${slot.y}`}
                label={categories[slot.category] ?? ''}
                number={index + 1}
                waiting={WAITING.has(index)}
                x={slot.x}
                y={slot.y}
                delay={index * 0.12}
              />
            ))}
          </div>

          <ul className="flex flex-1 flex-col gap-1.5">
            {perCategory.map((row) => (
              <li
                key={row.label}
                className="flex items-center gap-3 rounded-sm border border-white/10 bg-background/40 px-3 py-2"
              >
                <span className="text-sm text-foreground">{row.label}</span>
                <span
                  className={`ml-auto text-xs tabular-nums ${
                    row.filled === row.total ? 'text-accent' : 'text-foreground-weak'
                  }`}
                >
                  {row.filled}/{row.total}
                </span>
              </li>
            ))}
            <li className="mt-1 text-[0.7rem] leading-snug text-foreground-weak">
              {board.example}
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

/** A slot on the pitch: confirmed, or an outline still waiting on someone. */
function Token({
  label,
  number,
  waiting,
  x,
  y,
  delay,
}: {
  label: string
  number: number
  waiting: boolean
  x: number
  y: number
  delay: number
}) {
  return (
    <span
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span
        className={
          waiting
            ? 'landing-node flex size-7 items-center justify-center rounded-full border border-dashed border-accent/50 text-[0.6rem] text-accent/70'
            : 'flex size-7 items-center justify-center rounded-full border border-accent/40 bg-accent/15 text-[0.6rem] font-semibold text-accent'
        }
        style={{ '--landing-delay': `${delay}s` } as React.CSSProperties}
      >
        {number}
      </span>
      <span className="whitespace-nowrap text-[0.55rem] leading-none text-foreground-soft">
        {label}
      </span>
    </span>
  )
}

/** The pitch under the slots — markings only, no turf texture. */
function Pitch() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 60 80"
      preserveAspectRatio="none"
      className="absolute inset-0 size-full rounded-md border border-accent/15 bg-[radial-gradient(ellipse_at_center,_color-mix(in_srgb,var(--color-accent-strong)_22%,transparent)_0%,_transparent_75%)]"
    >
      <g fill="none" stroke="currentColor" className="text-accent" strokeWidth="0.3" opacity="0.45">
        <rect x="2" y="2" width="56" height="76" />
        <line x1="2" y1="40" x2="58" y2="40" />
        <circle cx="30" cy="40" r="8" />
        <rect x="16" y="2" width="28" height="11" />
        <rect x="16" y="67" width="28" height="11" />
        <rect x="24" y="2" width="12" height="4" />
        <rect x="24" y="74" width="12" height="4" />
      </g>
    </svg>
  )
}
