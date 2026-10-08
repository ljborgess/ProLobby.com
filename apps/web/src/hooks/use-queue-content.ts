import { useLocale } from '@/common/providers/locale-provider'
import { QUEUE_CONTENT } from '@/content/queue'

/** The queue screen dictionary for whichever locale is active right now. */
export function useQueueContent() {
  const { locale } = useLocale()
  return QUEUE_CONTENT[locale]
}
