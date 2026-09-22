import type { Metadata } from 'next'
import { AuthLayout } from '@/modules/account/auth-layout'
import { SignUpForm } from '@/modules/account/sign-up-form'
import { SignUpHeading } from '@/modules/account/sign-up-heading'

export const metadata: Metadata = {
  title: 'Criar conta — ProLobby',
}

export default function SignUpPage() {
  return (
    <AuthLayout variant="signUp">
      <SignUpHeading />
      <SignUpForm />
    </AuthLayout>
  )
}
