import type { Metadata } from 'next'
import { AuthLayout } from '@/modules/account/auth-layout'
import { ResetPasswordForm } from '@/modules/account/reset-password-form'
import { ResetPasswordHeading } from '@/modules/account/reset-password-heading'

export const metadata: Metadata = {
  title: 'Nova senha — ProLobby',
}

/** Where the password-reset link (RF-024) lands — 2026-09-23 review. */
export default function ResetPasswordPage() {
  return (
    <AuthLayout variant="signIn">
      <ResetPasswordHeading />
      <ResetPasswordForm />
    </AuthLayout>
  )
}
