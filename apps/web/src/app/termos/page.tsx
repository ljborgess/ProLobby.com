import Link from 'next/link'
import { LanguageSwitcher } from '@/common/ui/language-switcher'
import { Logo } from '@/common/ui/logo'
import { TermsDocument } from '@/modules/account/terms'
import { pageMetadata } from '@/common/page-metadata'

export const generateMetadata = () => pageMetadata('terms')

/** The Terms of Use, public: the address the sign-up dialog and e-mails link to. */
export default function TermsPage() {
  return (
    <main className="relative flex min-h-svh flex-1 flex-col px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4">
        <Link
          href="/"
          className="landing-focus inline-flex min-h-11 items-center rounded-full font-display text-base font-semibold tracking-tight text-foreground"
        >
          <Logo />
        </Link>
        <LanguageSwitcher />
      </div>
      <div className="mx-auto w-full max-w-3xl py-10">
        <TermsDocument />
      </div>
    </main>
  )
}
