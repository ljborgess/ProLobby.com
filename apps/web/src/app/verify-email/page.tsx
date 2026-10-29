import type { Metadata } from 'next'
import { AuthLayout } from '@/modules/account/auth-layout'
import { VerifyEmailStatus } from '@/modules/account/verify-email-status'

export const metadata: Metadata = {
  title: 'Verificação de e-mail — ProLobby',
}

/**
 * Where the verification link (RF-002) lands — 2026-09-23 review.
 *
 * Public, no session check: the token in the URL is the only credential this
 * flow needs, and it works whether or not the browser opening it is the one
 * that signed up.
 */
export default function VerifyEmailPage() {
  return (
    <AuthLayout variant="signUp">
      <VerifyEmailStatus />
    </AuthLayout>
  )
}
