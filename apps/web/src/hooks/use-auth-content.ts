import { useLocale } from '@/common/providers/locale-provider'
import { AUTH_CONTENT } from '@/content/auth'

/** The sign-up/sign-in dictionary for whichever locale is active right now. */
export function useAuthContent() {
  const { locale } = useLocale()
  return AUTH_CONTENT[locale]
}
