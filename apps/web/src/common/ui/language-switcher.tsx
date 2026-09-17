'use client'

import { useLocale } from '@/common/providers/locale-provider'
import { useAuthContent } from '@/hooks/use-auth-content'
import { LOCALES } from '@/content/locale'

const LOCALE_LABEL: Record<(typeof LOCALES)[number], string> = {
  pt: 'Português',
  es: 'Español',
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()
  const content = useAuthContent()

  return (
    <label className="flex items-center gap-2 text-sm text-foreground-soft">
      <span>{content.languageSwitcher.label}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as (typeof LOCALES)[number])}
        className="rounded-sm border border-white/10 bg-surface px-2 py-1 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {LOCALES.map((option) => (
          <option key={option} value={option}>
            {LOCALE_LABEL[option]}
          </option>
        ))}
      </select>
    </label>
  )
}
