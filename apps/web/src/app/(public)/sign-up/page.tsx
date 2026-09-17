import type { Metadata } from 'next'
import { LanguageSwitcher } from '@/common/ui/language-switcher'
import { SignUpForm } from '@/modules/account/sign-up-form'
import { SignUpHeading } from '@/modules/account/sign-up-heading'

export const metadata: Metadata = {
  title: 'Criar conta — ProLobby',
}

export default function SignUpPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12 sm:px-6">
      <SignUpHeading />
      <SignUpForm />
      <LanguageSwitcher />
    </main>
  )
}
