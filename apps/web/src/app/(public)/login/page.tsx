import type { Metadata } from 'next'
import { AuthLayout } from '@/modules/account/auth-layout'
import { SignInForm } from '@/modules/account/sign-in-form'
import { SignInHeading } from '@/modules/account/sign-in-heading'

export const metadata: Metadata = {
  title: 'Entrar — ProLobby',
}

export default function LoginPage() {
  return (
    <AuthLayout variant="signIn">
      <SignInHeading />
      <SignInForm />
    </AuthLayout>
  )
}
