'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { TextField } from '@/common/ui/text-field'
import { useAuthContent } from '@/hooks/use-auth-content'
import { AuthNote } from './auth-layout'

type Status = 'idle' | 'submitting' | 'sent'

/**
 * Asks the API for a password-reset link — RF-024, 2026-09-23 review.
 *
 * The API answers 202 the same for a known and an unknown address (RF-070),
 * so this form has exactly one outcome to show regardless of what it got back:
 * a network failure is the only thing that would ever look different, and even
 * that must not say whether the address exists.
 */
export function ForgotPasswordForm() {
  const content = useAuthContent().forgotPassword
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email') ?? '')

    setStatus('submitting')
    try {
      await fetch('/bff/accounts/password-resets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } catch {
      // Falls through to "sent" regardless — see the module comment: a
      // network error here must not read differently from an unknown
      // address, or the difference itself becomes the oracle RF-070 forbids.
    }
    setStatus('sent')
  }

  if (status === 'sent') {
    return (
      <div className="flex flex-col gap-5">
        {/* Waiting, never confirmed: the same words go out whether or not the
            address has an account (RF-070), so the mark cannot promise more. */}
        <AuthNote tone="waiting">
          <p role="status" className="text-sm leading-relaxed text-foreground">
            {content.sent}
          </p>
        </AuthNote>
        <Link href="/login" className="auth-link self-start text-sm">
          {content.backToSignIn}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} method="post" noValidate className="flex flex-col gap-4">
      <TextField
        name="email"
        type="email"
        autoComplete="email"
        label={content.emailLabel}
        required
      />

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="auth-submit landing-sheen px-5 text-base"
      >
        {status === 'submitting' ? content.submitting : content.submit}
      </button>

      <Link href="/login" className="auth-link self-center text-sm">
        {content.backToSignIn}
      </Link>
    </form>
  )
}
