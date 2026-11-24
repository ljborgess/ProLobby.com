import { useLocale } from '@/common/providers/locale-provider'
import { TWO_FACTOR_CONTENT } from '@/content/two-factor'

/** The second-factor dictionary for whichever locale is active right now. */
export function useTwoFactorContent() {
  const { locale } = useLocale()
  return TWO_FACTOR_CONTENT[locale]
}
