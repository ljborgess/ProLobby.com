'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TextField } from '@/common/ui/text-field'
import { useAuthContent } from '@/hooks/use-auth-content'

type Status = 'idle' | 'submitting' | 'error'

/**
 * The sign-in form — RF-022, issue #87.
 *
 * No client-side password rule (matches `SignInDto` on the API): enforcing
 * a minimum length here would tell an attacker a short guess is not worth
 * trying, which is exactly the signal RF-022's design avoids leaking.
 */
export function SignInForm() {
  const content = useAuthContent().signIn
  const router = useRouter()
  const [status, setStatus] = useState<Status>('idle')
  const [emailError, setEmailError] = useState<string>()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '')

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(content.invalidCredentials)
      return
    }
    setEmailError(undefined)

    setStatus('submitting')
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: data.get('password') }),
    })

    if (!response.ok) {
      setStatus('error')
      return
    }

    // The session cookie is already set by the relayed `Set-Cookie` — this
    // is just where the person lands next. There is no private area yet
    // (phase 2.2+), so home is the closest real destination.
    router.push('/')
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        name="email"
        type="email"
        autoComplete="email"
        label={content.emailLabel}
        error={emailError}
      />
      <TextField
        name="password"
        type="password"
        autoComplete="current-password"
        label={content.passwordLabel}
      />

      {status === 'error' && (
        <p role="alert" className="text-sm text-danger">
          {content.invalidCredentials}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded-sm bg-accent px-4 py-3 text-base font-medium text-background disabled:opacity-60"
      >
        {status === 'submitting' ? content.submitting : content.submit}
      </button>

      <Link href="/sign-up" className="text-sm text-foreground-soft underline">
        {content.switchToSignUp}
      </Link>
    </form>
  )
}
