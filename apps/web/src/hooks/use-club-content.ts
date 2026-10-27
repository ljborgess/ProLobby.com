import { useLocale } from '@/common/providers/locale-provider'
import { CLUB_CONTENT } from '@/content/club'

/** The declared club dictionary for whichever locale is active right now. */
export function useClubContent() {
  const { locale } = useLocale()
  return CLUB_CONTENT[locale]
}
