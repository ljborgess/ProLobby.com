import type { Metadata } from 'next'
import { AuthLayout } from '@/modules/account/auth-layout'
import { SignUpForm } from '@/modules/account/sign-up-form'

export const metadata: Metadata = {
  title: 'Criar conta — ProLobby',
}

export default function SignUpPage() {
  return (
    <AuthLayout variant="signUp">
      <SignUpForm />
    </AuthLayout>
  )
}
