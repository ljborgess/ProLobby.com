import type { Metadata } from 'next'
import { AuthLayout } from '@/modules/account/auth-layout'
import { ForgotPasswordForm } from '@/modules/account/forgot-password-form'
import { ForgotPasswordHeading } from '@/modules/account/forgot-password-heading'

export const metadata: Metadata = {
  title: 'Esqueci minha senha — ProLobby',
}

/**
 * Where "esqueci minha senha" on the login screen lands — RF-024, 2026-09-23
 * review. The email `resend-mail.sender.ts` sends on ADDRESS_ALREADY_REGISTERED
 * already told people to look for this; there was nowhere for them to land.
 * Same frame as the login it came from (2026-10-29).
 */
export default function ForgotPasswordPage() {
  return (
    <AuthLayout variant="signIn">
      <ForgotPasswordHeading />
      <ForgotPasswordForm />
    </AuthLayout>
  )
}
