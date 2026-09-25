import { useLocale } from '@/common/providers/locale-provider'
import { MODERATION_CONTENT } from '@/content/moderation'

/** The moderation dictionary for whichever locale is active right now. */
export function useModerationContent() {
  const { locale } = useLocale()
  return MODERATION_CONTENT[locale]
}
