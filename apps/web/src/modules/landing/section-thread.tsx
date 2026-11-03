/**
 * The connectors that run between the landing's sections.
 *
 * Together they read as a chronology: a numbered thread that draws itself as
 * the reader descends, so the page is one argument in order rather than a
 * stack of unrelated panels. Each seam gets a different figure — a straight
 * run, a fork, a dashed stretch, a jog — so the repetition reads as a route
 * with landmarks instead of the same divider five times.
 *
 * Drawn on a scroll timeline, so the line's progress is the reader's progress
 * and nothing animates for an empty room. `pathLength="1"` normalises every
 * shape to one dash, which is why one CSS rule drives all four.
 *
 * Wholly decorative: the numbers are not content, the headings carry the
 * meaning, so the whole block is `aria-hidden` (RNF-015 — a screen reader
 * gains nothing from "02" announced between two sections).
 */

type Variant = 'line' | 'fork' | 'dashes' | 'jog'

/** Each figure, in a 40-wide by 120-tall box, drawn top-centre to bottom-centre. */
const FIGURES: Record<Variant, React.ReactNode> = {
  line: <path d="M20 0 V120" pathLength={1} className="landing-draw" />,
  fork: (
    <>
      <path d="M20 0 V54" pathLength={1} className="landing-draw" />
      <path d="M20 54 C20 78 6 78 6 102" pathLength={1} className="landing-draw" opacity={0.45} />
      <path d="M20 54 C20 78 34 78 34 102" pathLength={1} className="landing-draw" opacity={0.45} />
      <path d="M20 54 V120" pathLength={1} className="landing-draw" />
    </>
  ),
  dashes: (
    <path d="M20 0 V120" pathLength={1} className="landing-draw" strokeDasharray="0.06 0.05" />
  ),
  jog: (
    <path
      d="M20 0 V38 C20 52 34 52 34 66 C34 80 20 80 20 94 V120"
      pathLength={1}
      className="landing-draw"
    />
  ),
}

export function SectionThread({ variant = 'line' }: { variant?: Variant }) {
  return (
    <div aria-hidden className="relative z-10 -mt-16 flex justify-center">
      <svg
        viewBox="0 0 40 120"
        width={40}
        height={120}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        className="overflow-visible text-accent/45"
      >
        {FIGURES[variant]}
      </svg>

      {/* The node where the line meets the seam between two sections: the
       * panel colour, with a ring to cut it out of whatever is behind. No
       * number since 2026-10-29 — "01" to "04" said nothing the order did not. */}
      <span
        aria-hidden
        className="landing-thread-node absolute bottom-0 left-1/2 size-3 -translate-x-1/2 translate-y-1/2 rounded-full border border-accent/60 bg-surface shadow-[0_0_0_4px_var(--color-bg)]"
      />
    </div>
  )
}

/**
 * The end of the line: the pitch's centre circle with its spot, so the thread
 * closes where a match restarts instead of simply stopping mid-air above the
 * footer. The spot lands a beat after the circle closes.
 */
export function SectionThreadEnd() {
  return (
    <div aria-hidden className="relative z-10 -mt-16 flex justify-center">
      <svg
        viewBox="0 0 40 120"
        width={40}
        height={120}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        className="overflow-visible text-accent/45"
      >
        <path d="M20 0 V104" pathLength={1} className="landing-draw" />
        <circle cx="20" cy="110" r="5" pathLength={1} className="landing-draw" />
        <circle
          cx="20"
          cy="110"
          r="1.4"
          fill="currentColor"
          stroke="none"
          className="landing-thread-spot"
        />
      </svg>
    </div>
  )
}
