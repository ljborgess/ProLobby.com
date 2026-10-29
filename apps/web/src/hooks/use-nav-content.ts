import { useLocale } from '@/common/providers/locale-provider'
import { NAV_CONTENT } from '@/content/nav'

/** The signed-in menu's dictionary for whichever locale is active right now. */
export function useNavContent() {
  const { locale } = useLocale()
  return NAV_CONTENT[locale]
}
