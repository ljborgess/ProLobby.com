import type { Metadata } from 'next'
import Link from 'next/link'
import { AccountBackdrop } from '@/modules/account/account-backdrop'
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
    <main className="relative flex min-h-svh flex-1 items-center justify-center overflow-hidden px-4 py-10">
      <AccountBackdrop />
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="landing-focus self-center font-display text-base font-semibold tracking-tight text-foreground"
        >
          Pro<span className="text-accent">Lobby</span>
        </Link>
        <VerifyEmailStatus />
      </div>
    </main>
  )
}
