import { useLocale } from '@/common/providers/locale-provider'
import { MODERATION_TOOLS_CONTENT } from '@/content/moderation-tools'

/** The management sections' dictionary for whichever locale is active right now. */
export function useModerationToolsContent() {
  const { locale } = useLocale()
  return MODERATION_TOOLS_CONTENT[locale]
}
