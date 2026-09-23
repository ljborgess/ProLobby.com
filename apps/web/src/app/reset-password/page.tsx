import type { Metadata } from 'next'
import Link from 'next/link'
import { AccountBackdrop } from '@/modules/account/account-backdrop'
import { ResetPasswordForm } from '@/modules/account/reset-password-form'
import { ResetPasswordHeading } from '@/modules/account/reset-password-heading'

export const metadata: Metadata = {
  title: 'Nova senha — ProLobby',
}

/** Where the password-reset link (RF-024) lands — 2026-09-23 review. */
export default function ResetPasswordPage() {
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
        <ResetPasswordHeading />
        <ResetPasswordForm />
      </div>
    </main>
  )
}
