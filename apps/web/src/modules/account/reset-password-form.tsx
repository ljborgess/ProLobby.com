'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { TextField } from '@/common/ui/text-field'
import { useAuthContent } from '@/hooks/use-auth-content'

type Status = 'idle' | 'submitting' | 'success' | 'invalidToken' | 'error'

/**
 * Sets a new password from the emailed link — RF-024, 2026-09-23 review.
 *
 * No client-side minimum beyond what the hint states: the API's own rule
 * (`ConfirmPasswordResetDto`) is the source of truth, and duplicating it here
 * would be one more place to keep in sync.
 */
export function ResetPasswordForm() {
  const content = useAuthContent().resetPassword
  const token = useSearchParams().get('token') ?? ''
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const password = String(new FormData(event.currentTarget).get('password') ?? '')

    setStatus('submitting')

    let response: Response
    try {
      response = await fetch('/bff/accounts/password-resets/confirmations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
    } catch {
      setStatus('error')
      return
    }

    if (response.status === 204) {
      setStatus('success')
      return
    }

    // Every failure (unknown, expired, already used) answers 400 the same
    // way (RF-024) — a guessed token must not learn which it was.
    setStatus(response.status === 400 ? 'invalidToken' : 'error')
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="text-sm text-danger">
          {content.invalidToken}
        </p>
        <RequestNewLink label={content.requestNew} />
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-sm text-accent">
          {content.success}
        </p>
        <Link href="/login" className="text-sm text-foreground-soft underline">
          {content.goToSignIn}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} method="post" noValidate className="flex flex-col gap-4">
      <TextField
        name="password"
        type="password"
        autoComplete="new-password"
        label={content.passwordLabel}
        hint={content.passwordHint}
        minLength={12}
        required
      />

      {(status === 'invalidToken' || status === 'error') && (
        <p role="alert" className="text-sm text-danger">
          {status === 'invalidToken' ? content.invalidToken : content.genericError}
        </p>
      )}
      {status === 'invalidToken' && <RequestNewLink label={content.requestNew} />}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded-sm bg-accent px-4 py-3 text-base font-medium text-background disabled:opacity-60"
      >
        {status === 'submitting' ? content.submitting : content.submit}
      </button>
    </form>
  )
}

/** A dead link is not a dead end: the way out is asking for a new one. */
function RequestNewLink({ label }: { label: string }) {
  return (
    <Link
      href="/forgot-password"
      className="landing-focus self-start text-sm text-accent underline underline-offset-4"
    >
      {label}
    </Link>
  )
}
