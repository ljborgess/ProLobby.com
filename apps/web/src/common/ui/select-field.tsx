'use client'

import { useId } from 'react'

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder: string
}

/** Labelled native select, wired like `TextField` (RNF-015). */
export function SelectField({
  label,
  hint,
  error,
  options,
  placeholder,
  id,
  className,
  ...selectProps
}: SelectFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const hintId = hint ? `${fieldId}-hint` : undefined
  const errorId = error ? `${fieldId}-error` : undefined

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-xs font-medium text-foreground-soft">
        {label}
      </label>
      <select
        id={fieldId}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? true : undefined}
        className={`rounded-sm border border-white/30 bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent ${className ?? ''}`}
        {...selectProps}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
