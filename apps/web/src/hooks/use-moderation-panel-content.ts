import { useLocale } from '@/common/providers/locale-provider'
import { MODERATION_PANEL_CONTENT } from '@/content/moderation-panel'

/** The moderation panel's dictionary for whichever locale is active right now. */
export function useModerationPanelContent() {
  const { locale } = useLocale()
  return MODERATION_PANEL_CONTENT[locale]
}
