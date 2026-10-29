'use client'

import { type CSSProperties } from 'react'
import { useLocale } from '@/common/providers/locale-provider'
import { useAuthContent } from '@/hooks/use-auth-content'
import { LOCALES } from '@/content/locale'

const LOCALE_LABEL: Record<(typeof LOCALES)[number], string> = {
  pt: 'Português',
  es: 'Español',
}

/**
 * The language, as a two-way switch: PT | ES, the chosen one under a sliding
 * plate, like a setting in a game menu (audit of 2026-10-29: a native select
 * read as a form field and weighed as much as the page's own controls).
 *
 * Native radios underneath, so the arrow keys move between the two and a
 * screen reader hears "Idioma, Português, 1 of 2"; the short code is what is
 * drawn, the full name is what is announced.
 */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale()
  const content = useAuthContent()
  const at = LOCALES.indexOf(locale)

  return (
    <div
      role="radiogroup"
      aria-label={content.languageSwitcher.label}
      style={{ '--at': at } as CSSProperties}
      className={`relative inline-grid h-11 grid-cols-2 rounded-full border border-white/20 bg-white/[0.04] p-1 ${className}`}
    >
      <span
        aria-hidden
        className="lang-thumb absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-foreground shadow-[0_4px_12px_rgb(0_0_0/35%)]"
      />
      {LOCALES.map((option) => (
        <label
          key={option}
          className={`relative z-10 flex min-w-11 cursor-pointer items-center justify-center rounded-full px-3 font-display text-xs font-semibold uppercase tracking-[0.14em] transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
            option === locale ? 'text-background' : 'text-foreground-soft hover:text-foreground'
          }`}
        >
          <input
            type="radio"
            name="locale"
            value={option}
            checked={option === locale}
            onChange={() => setLocale(option)}
            aria-label={LOCALE_LABEL[option]}
            className="sr-only"
          />
          <span aria-hidden>{option}</span>
        </label>
      ))}
    </div>
  )
}
