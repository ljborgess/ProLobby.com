/**
 * The two languages the platform ships in — RNF-016. No i18n library: text
 * lives in this directory, one dictionary per domain, picked by this type.
 */
export const LOCALES = ['pt', 'es'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'pt'

/** Where the chosen locale is persisted, read again on the next visit. */
export const LOCALE_COOKIE = 'locale'

export function isLocale(value: string | undefined): value is Locale {
  return LOCALES.includes(value as Locale)
}
