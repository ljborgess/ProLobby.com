/**
 * The ProLobby mark — four corner brackets locking on a green point, the
 * same brackets that frame the lobby card (`Brackets`). The corners take the
 * text colour, so the mark works in one colour too; only the point is accent.
 */
export function LogoMark({ className = 'size-[1em]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <path
        d="M7 12V7h5M20 7h5v5M7 20v5h5M20 25h5v-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="square"
      />
      <circle cx="16" cy="16" r="3.5" className="fill-accent" />
    </svg>
  )
}

/** Mark and wordmark, "Pro" in the text colour and "Lobby" in the accent. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.35em] ${className}`}>
      <LogoMark />
      <span>
        Pro<span className="text-accent">Lobby</span>
      </span>
    </span>
  )
}
