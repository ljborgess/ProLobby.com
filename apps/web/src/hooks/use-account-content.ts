import { useLocale } from '@/common/providers/locale-provider'
import { ACCOUNT_CONTENT } from '@/content/account'

/** The logged-in home dictionary for whichever locale is active right now. */
export function useAccountContent() {
  const { locale } = useLocale()
  return ACCOUNT_CONTENT[locale]
}
