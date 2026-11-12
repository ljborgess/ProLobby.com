import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from '@/content/locale'

/**
 * The language the visitor chose, read server-side from its cookie. `isLocale`
 * guards against a stale or tampered value: anything else is the default.
 * Reading a cookie makes whatever calls this dynamic.
 */
export async function readLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value
  return isLocale(value) ? value : DEFAULT_LOCALE
}
