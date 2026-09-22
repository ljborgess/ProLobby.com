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

export function SectionThread({ step, variant = 'line' }: { step: number; variant?: Variant }) {
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

      {/* The step marker, sitting on the end of the line.
       *
       * It lands exactly on the seam between two sections, which is where the
       * background colour changes — the first build put a `bg-background`
       * badge half over a `bg-surface` section and the digits vanished into
       * it. So: the panel colour, a ring to cut it out of whatever is behind,
       * and a shadow to lift it off the join. Two digits always, because "01"
       * beside "02" keeps the column aligned down the page. */}
      <span className="landing-thread-node absolute bottom-0 left-1/2 flex size-9 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-accent/50 bg-surface text-xs font-semibold tabular-nums text-accent shadow-[0_0_0_4px_var(--color-bg),0_0_18px_color-mix(in_srgb,var(--color-accent)_30%,transparent)]">
        {String(step).padStart(2, '0')}
      </span>
    </div>
  )
}

/**
 * The end of the line: a ring with nothing after it, so the thread closes
 * instead of simply stopping mid-air above the footer.
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
      </svg>
    </div>
  )
}
