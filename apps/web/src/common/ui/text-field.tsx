'use client'

import { useId, useState } from 'react'

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
  /**
   * On a password field, the name of the button that shows what was typed.
   * Without it the field stays a plain password input.
   */
  revealLabel?: string
}

const INPUT =
  'min-h-11 w-full rounded-sm border border-white/30 bg-surface px-3.5 py-2.5 text-sm text-foreground caret-accent [color-scheme:dark] outline-none transition-colors hover:border-white/45 focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent aria-[invalid=true]:border-danger/70'

/**
 * Labelled input with room for a hint and an error — RNF-015.
 *
 * Every instance gets its own generated ids (`useId`), so two fields on the
 * same page never collide even if a caller forgets to pass one. `aria-*`
 * wiring is what makes a screen reader announce the hint/error at all; a
 * `<label>` alone does not reach either.
 *
 * A password field with `revealLabel` gets an eye at its right edge: sign-up
 * has no "repeat password", so seeing the twelve characters is the only check
 * on a typo. Its name lives in the button's own text, never in `aria-label`,
 * so a lookup by the field's label ("Senha") still finds the input alone.
 */
export function TextField({
  label,
  hint,
  error,
  revealLabel,
  id,
  className,
  type,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const [revealed, setRevealed] = useState(false)
  const canReveal = type === 'password' && revealLabel !== undefined

  const input = (
    <input
      id={fieldId}
      type={canReveal && revealed ? 'text' : type}
      aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
      aria-invalid={error ? true : undefined}
      className={`${INPUT} ${canReveal ? 'pr-12' : ''} ${className ?? ''}`}
      {...inputProps}
    />
  )

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-xs font-medium text-foreground-soft">
        {label}
      </label>
      {canReveal ? (
        <div className="relative">
          {input}
          <button
            type="button"
            aria-pressed={revealed}
            aria-controls={fieldId}
            onClick={() => setRevealed((value) => !value)}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-sm text-foreground-soft outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent aria-pressed:text-accent"
          >
            <EyeMark open={revealed} />
            <span className="sr-only">{revealLabel}</span>
          </button>
        </div>
      ) : (
        input
      )}
      {hint && !error && (
        <p id={hintId} className="text-xs leading-snug text-foreground-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

/** An eye drawn in the panel's hairline; struck through while the text is hidden. */
function EyeMark({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.75" />
      {!open && <path d="M4 20 20 4" />}
    </svg>
  )
}
