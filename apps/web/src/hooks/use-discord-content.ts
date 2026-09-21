import { useLocale } from '@/common/providers/locale-provider'
import { DISCORD_CONTENT } from '@/content/discord'

/** The Discord link dictionary for whichever locale is active right now. */
export function useDiscordContent() {
  const { locale } = useLocale()
  return DISCORD_CONTENT[locale]
}
