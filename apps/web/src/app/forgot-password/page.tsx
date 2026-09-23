import type { Metadata } from 'next'
import Link from 'next/link'
import { AccountBackdrop } from '@/modules/account/account-backdrop'
import { ForgotPasswordForm } from '@/modules/account/forgot-password-form'
import { ForgotPasswordHeading } from '@/modules/account/forgot-password-heading'

export const metadata: Metadata = {
  title: 'Esqueci minha senha — ProLobby',
}

/**
 * Where "esqueci minha senha" on the login screen lands — RF-024, 2026-09-23
 * review. The email `resend-mail.sender.ts` sends on ADDRESS_ALREADY_REGISTERED
 * already told people to look for this; there was nowhere for them to land.
 */
export default function ForgotPasswordPage() {
  return (
    <main className="relative flex min-h-svh flex-1 items-center justify-center overflow-hidden px-4 py-10">
      <AccountBackdrop />
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="landing-focus self-center font-display text-base font-semibold tracking-tight text-foreground"
        >
          Pro<span className="text-accent">Lobby</span>
        </Link>
        <ForgotPasswordHeading />
        <ForgotPasswordForm />
      </div>
    </main>
  )
}
