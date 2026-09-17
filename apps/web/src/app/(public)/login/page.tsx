import type { Metadata } from 'next'
import { LanguageSwitcher } from '@/common/ui/language-switcher'
import { SignInForm } from '@/modules/account/sign-in-form'
import { SignInHeading } from '@/modules/account/sign-in-heading'

export const metadata: Metadata = {
  title: 'Entrar — ProLobby',
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12 sm:px-6">
      <SignInHeading />
      <SignInForm />
      <LanguageSwitcher />
    </main>
  )
}
