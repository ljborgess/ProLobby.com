import Link from 'next/link'

type Props = {
  label: string
  /** `back` walks to the previous place; `cancel` drops what is open. */
  kind?: 'back' | 'cancel'
  className?: string
} & ({ href: string; onClick?: never } | { onClick: () => void; href?: never })

/**
 * Every "go back" and "cancel" in the signed-in screens, one shape: a drawn
 * mark in a hairline ring beside the words, no underline, no text arrow.
 * The ring is what reads as a control; on hover it takes the accent and the
 * mark leans one step the way it leads. Quiet on purpose — a way out never
 * competes with the step's own action.
 */
export function BackAction({ label, kind = 'back', className = '', ...target }: Props) {
  const body = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] transition-colors duration-200 group-hover:border-accent/50 group-hover:text-accent">
        {kind === 'back' ? (
          <ChevronLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
        ) : (
          <CloseMark className="size-3.5 transition-transform duration-200 group-hover:rotate-90 motion-reduce:transition-none motion-reduce:group-hover:rotate-0" />
        )}
      </span>
      <span>{label}</span>
    </>
  )
  const classes = `landing-focus group inline-flex min-h-11 items-center gap-2.5 self-start rounded-full pr-2 text-sm text-foreground-soft transition-colors duration-200 hover:text-foreground ${className}`

  if (target.href !== undefined) {
    return (
      <Link href={target.href} className={classes}>
        {body}
      </Link>
    )
  }
  return (
    <button type="button" onClick={target.onClick} className={classes}>
      {body}
    </button>
  )
}

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M14.5 6.5 9 12l5.5 5.5" />
    </svg>
  )
}

function CloseMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      aria-hidden
      className={className}
    >
      <path d="M7 7l10 10M17 7 7 17" />
    </svg>
  )
}
