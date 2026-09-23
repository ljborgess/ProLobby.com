'use client'

import { useLandingContent } from '@/hooks/use-landing-content'

/**
 * The queue board: eleven slots on a pitch, filling up.
 *
 * Built to the lineup format the team already shipped in
 * `escalacao-brasileirao` (docs/assets/demo-campo.png), which the user pointed
 * at as the shape the Fase 2.5 queue screen should take — pitch on one side,
 * roster grouped by category on the other.
 *
 * **Redrawn rather than embedded.** That PNG is a capture of a different
 * product, down to real footballers' names and club crests; dropped onto this
 * page it would read as a screenshot of ProLobby showing data ProLobby does
 * not have. So the format is reused and the content is ours: the five position
 * categories, eleven slots, some confirmed and some still waiting.
 *
 * It is labelled an example in the UI, not only in this comment. The queue is
 * Fase 2.5 — nothing here is live, and a mock that does not say so is a lie
 * with good manners. For the same reason the pitch itself is `aria-hidden`:
 * a screen reader announcing eleven invented players as if they were in a
 * lobby would be that lie, read aloud. The roster beside it carries the real
 * point — which categories a lobby needs — in text.
 */

/**
 * The eleven slots, as a 4-3-3 mapped onto the five categories the platform
 * actually has (`docs/produto/02-jogador/02-ranking.md`): four at the back all
 * count as zaga, three in midfield, two wide, one up front.
 *
 * `x`/`y` are percentages of the pitch box, attacking upward, and `shirt` is
 * the number the position wears. The back four are staggered — full-backs
 * pushed up, centre-backs held — because four dots on one line reads as a wall
 * rather than a defence, and the midfield sits below the centre circle so the
 * markings do not cut through the tokens.
 */
const SLOTS = [
  { x: 50, y: 88, category: 0, shirt: 1 },
  { x: 21, y: 71, category: 1, shirt: 2 },
  { x: 40, y: 75, category: 1, shirt: 4 },
  { x: 60, y: 75, category: 1, shirt: 5 },
  { x: 79, y: 71, category: 1, shirt: 3 },
  { x: 29, y: 54, category: 2, shirt: 6 },
  { x: 50, y: 60, category: 2, shirt: 8 },
  { x: 71, y: 54, category: 2, shirt: 7 },
  { x: 22, y: 31, category: 3, shirt: 11 },
  { x: 78, y: 31, category: 3, shirt: 10 },
  { x: 50, y: 19, category: 4, shirt: 9 },
] as const

/** Which slots are still open in the example. Two, so the board reads as mid-fill. */
const WAITING = new Set([3, 8])

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
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[0.7rem] tabular-nums text-foreground-soft">
            {board.formation}
          </span>
        </div>

        <div aria-hidden className="landing-rule my-4" />

        <div className="flex flex-col gap-5 sm:flex-row sm:gap-5">
          <div aria-hidden className="relative aspect-[4/5] w-full sm:w-[55%]">
            <Pitch />
            {SLOTS.map((slot, index) => (
              <Token
                key={slot.shirt}
                shirt={slot.shirt}
                waiting={WAITING.has(index)}
                x={slot.x}
                y={slot.y}
                delay={index * 0.31}
              />
            ))}
          </div>

          <ul className="flex flex-1 flex-col gap-1.5">
            {perCategory.map((row) => {
              const complete = row.filled === row.total
              return (
                <li
                  key={row.label}
                  className={`relative flex items-center gap-3 overflow-hidden rounded-sm border px-3 py-2 ${
                    complete ? 'border-white/10 bg-background/40' : 'border-accent/25 bg-accent/5'
                  }`}
                >
                  {!complete && (
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-accent/70 to-transparent"
                    />
                  )}
                  <span className="text-sm text-foreground">{row.label}</span>
                  <span
                    className={`ml-auto text-xs tabular-nums ${
                      complete ? 'text-foreground-soft' : 'text-accent'
                    }`}
                  >
                    {row.filled}/{row.total}
                  </span>
                  {/* The state in words, not only in colour and count — the
                      accessible truth, and what the `filled`/`waiting` strings
                      exist for. */}
                  <span className="sr-only">{complete ? board.filled : board.waiting}</span>
                </li>
              )
            })}
            <li className="mt-1 text-[0.7rem] leading-snug text-foreground-soft">
              {board.example}
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

/**
 * A slot on the pitch: taken and drifting, or an outline still breathing.
 *
 * The shirt number alone, no label underneath. Eleven captions on a box this
 * size collided with each other and with the markings, and they were never
 * carrying the information anyway — the roster beside the pitch is where the
 * categories are named, in text a screen reader can reach.
 */
function Token({
  shirt,
  waiting,
  x,
  y,
  delay,
}: {
  shirt: number
  waiting: boolean
  x: number
  y: number
  delay: number
}) {
  return (
    <span
      className={`absolute -translate-x-1/2 -translate-y-1/2 ${waiting ? '' : 'landing-bob'}`}
      style={{ left: `${x}%`, top: `${y}%`, '--landing-delay': `${delay}s` } as React.CSSProperties}
    >
      <span
        className={
          waiting
            ? 'landing-slot-wait flex size-6 items-center justify-center rounded-full border border-dashed border-accent/60 text-[0.55rem] font-semibold text-accent'
            : 'flex size-6 items-center justify-center rounded-full border border-accent/60 bg-accent/25 text-[0.55rem] font-semibold text-accent shadow-[0_0_12px_color-mix(in_srgb,var(--color-accent)_35%,transparent)]'
        }
        style={{ '--landing-delay': `${delay}s` } as React.CSSProperties}
      >
        {shirt}
      </span>
    </span>
  )
}

/**
 * The pitch under the slots.
 *
 * Markings only, one weight, low contrast — the players are the subject and a
 * busy pitch competes with them. The mown stripes that were here went: at this
 * size they read as banding, not grass. What replaces them is a line of light
 * sweeping up the pitch, which is the one thing that makes the board look like
 * a live readout rather than a diagram.
 */
function Pitch() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-md border border-accent/20 bg-[linear-gradient(to_top,_color-mix(in_srgb,var(--color-accent-strong)_14%,transparent),_transparent_60%)]">
      <svg viewBox="0 0 60 80" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <g
          fill="none"
          stroke="currentColor"
          className="text-accent"
          strokeWidth="0.25"
          opacity="0.35"
        >
          <rect x="3" y="3" width="54" height="74" rx="1" />
          <line x1="3" y1="40" x2="57" y2="40" />
          <circle cx="30" cy="40" r="6" />
          <rect x="19" y="3" width="22" height="9" />
          <rect x="19" y="68" width="22" height="9" />
        </g>
      </svg>

      <div
        aria-hidden
        className="landing-pitch-scan absolute inset-x-0 top-0 h-16 bg-[linear-gradient(to_top,_transparent,_color-mix(in_srgb,var(--color-accent)_18%,transparent))]"
      />
    </div>
  )
}
