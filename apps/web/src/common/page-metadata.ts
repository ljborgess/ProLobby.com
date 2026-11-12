import type { Metadata } from 'next'
import { readLocale } from '@/common/locale-cookie'
import { PAGE_TITLES, type PageTitleKey } from '@/content/page-titles'

/** The tab title in the language the visitor chose (#296), the one the root layout uses for `lang`. */
export async function pageMetadata(key: PageTitleKey): Promise<Metadata> {
  const locale = await readLocale()
  return { title: `${PAGE_TITLES[locale][key]} — ProLobby` }
}
