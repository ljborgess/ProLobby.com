'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { LOCALE_COOKIE, type Locale } from '@/content/locale'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

/**
 * Client-side half of the locale switch — issue #87.
 *
 * `RootLayout` (server) already picked the right `initialLocale` from the
 * cookie, so first paint is correct without this context doing anything.
 * This exists only for switching *after* that: writing the cookie so the
 * choice survives a reload, and updating `<html lang>` live so assistive
 * tech reflects the change immediately (RNF-015).
 */
export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale
  children: React.ReactNode
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    document.documentElement.lang = next
    // One year, path-wide: a locale choice is a preference, not a session.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
  }, [])

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}
