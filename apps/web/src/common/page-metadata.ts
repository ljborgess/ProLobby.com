import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from '@/content/locale'
import { PAGE_TITLES, type PageTitleKey } from '@/content/page-titles'

/**
 * The tab title in the language the visitor chose (#296), read from the same
 * cookie, and validated the same way, as the root layout does for `lang`.
 * Reading a cookie makes the route dynamic — every route that uses this one
 * already reads the session cookie or sits on a form, so nothing that was
 * static becomes dynamic here.
 */
export async function pageMetadata(key: PageTitleKey): Promise<Metadata> {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE
  return { title: `${PAGE_TITLES[locale][key]} — ProLobby` }
}
