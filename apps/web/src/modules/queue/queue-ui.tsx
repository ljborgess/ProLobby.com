/** Bits shared by the queue screen and its lobby steps (#233, #252). */

export const PRIMARY =
  'landing-focus landing-sheen inline-flex items-center justify-center gap-2 min-h-11 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background shadow-[0_8px_20px_rgb(0_0_0/25%)] transition-transform duration-200 hover:scale-[1.04] active:scale-95 disabled:opacity-50 disabled:hover:scale-100'

export const SECONDARY =
  'landing-focus inline-flex items-center justify-center min-h-11 rounded-full border border-white/30 px-5 py-2.5 text-sm text-foreground-soft transition-colors hover:border-white/35 hover:text-foreground disabled:opacity-50'

/** Whole seconds from `now` to `until`, never below zero. */
export const secondsTo = (until: string, now: number) =>
  Math.max(0, Math.ceil((new Date(until).getTime() - now) / 1000))

export const clockOf = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * Keeps Tab inside a modal: from the last control back to the first, and
 * the other way with Shift. With nothing to focus (a card only waiting),
 * focus stays on the dialog itself.
 */
export function trapFocus(event: React.KeyboardEvent<HTMLElement>) {
  if (event.key !== 'Tab') return
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select, textarea',
    ),
  )
  const first = controls[0]
  const last = controls.at(-1)
  if (!first || !last) {
    event.preventDefault()
    return
  }
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

/**
 * A step's clock: the ring drains with the time left and the middle says it,
 * in seconds under a minute and in m:ss above.
 */
export function CountdownRing({
  left,
  total,
  caption,
  small = false,
}: {
  left: number
  total: number
  caption: string
  small?: boolean
}) {
  const share = Math.min(1, left / total)
  return (
    <div className={`relative ${small ? 'size-24' : 'size-36'}`}>
      <svg viewBox="0 0 120 120" aria-hidden className="absolute inset-0 size-full -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(255 255 255 / 8%)" strokeWidth={5} />
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
      <svg viewBox="0 0 120 120" aria-hidden className="queue-ring-3d absolute inset-0 size-full">
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
        <span
          className={`font-display font-light leading-none tracking-[-0.03em] text-foreground tabular-nums ${
            small ? 'text-3xl' : 'text-5xl'
          }`}
        >
          {left >= 60 ? clockOf(left * 1000) : left}
        </span>
        <span className="mt-1 max-w-[80%] text-center text-[0.7rem] leading-tight text-foreground-soft">
          {caption}
        </span>
      </div>
    </div>
  )
}
