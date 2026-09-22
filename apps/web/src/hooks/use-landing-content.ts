import { useLocale } from '@/common/providers/locale-provider'
import { LANDING_CONTENT } from '@/content/landing'

/** The landing dictionary for whichever locale is active right now. */
export function useLandingContent() {
  const { locale } = useLocale()
  return LANDING_CONTENT[locale]
}
