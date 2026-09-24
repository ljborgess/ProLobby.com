import { useLocale } from '@/common/providers/locale-provider'
import { CHARACTER_CONTENT } from '@/content/character'

/** The character screen dictionary for whichever locale is active right now. */
export function useCharacterContent() {
  const { locale } = useLocale()
  return CHARACTER_CONTENT[locale]
}
