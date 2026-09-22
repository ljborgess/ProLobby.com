'use client'

import { useId } from 'react'

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
}

/**
 * Labelled input with room for a hint and an error — RNF-015.
 *
 * Every instance gets its own generated ids (`useId`), so two fields on the
 * same page never collide even if a caller forgets to pass one. `aria-*`
 * wiring is what makes a screen reader announce the hint/error at all; a
 * `<label>` alone does not reach either.
 */
export function TextField({ label, hint, error, id, className, ...inputProps }: TextFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-xs font-medium text-foreground-soft">
        {label}
      </label>
      <input
        id={fieldId}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? true : undefined}
        className={`rounded-sm border border-white/10 bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent ${className ?? ''}`}
        {...inputProps}
      />
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
