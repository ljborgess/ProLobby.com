'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TextField } from '@/common/ui/text-field'
import { useAuthContent } from '@/hooks/use-auth-content'
import { AuthNote } from './auth-layout'

type Status = 'idle' | 'submitting' | 'error' | 'networkError'

/**
 * The sign-in form — RF-022, issue #87.
 *
 * No client-side password rule (matches `SignInDto` on the API): enforcing
 * a minimum length here would tell an attacker a short guess is not worth
 * trying, which is exactly the signal RF-022's design avoids leaking.
 */
export function SignInForm() {
  const { signIn: content, forgotPassword } = useAuthContent()
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

    let response: Response
    try {
      response = await fetch('/bff/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: data.get('password') }),
      })
    } catch {
      // Without this the button stays disabled in 'submitting' forever on a
      // dropped connection, with nothing on screen explaining why.
      setStatus('networkError')
      return
    }

    // 502: the proxy could not reach the API. Saying "wrong password" here sends
    // the person to reset a password that was right all along.
    if (response.status === 502) {
      setStatus('networkError')
      return
    }

    if (!response.ok) {
      // 429 included: the message stays "wrong credentials" on purpose, so a
      // rate-limited attempt does not confirm that the address exists
      // (RF-070).
      setStatus('error')
      return
    }

    // The session cookie is already set by the relayed `Set-Cookie` — this
    // is just where the person lands next. /verifications is the signed-in
    // area (routing change of 2026-09-22); the public home never renders a
    // dashboard for someone who is already logged in.
    router.push('/verifications')
  }

  return (
    <form onSubmit={handleSubmit} method="post" noValidate className="flex flex-col gap-4">
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
      <Link href="/forgot-password" className="auth-link -my-1 self-end py-1 text-sm">
        {forgotPassword.linkLabel}
      </Link>

      {(status === 'error' || status === 'networkError') && (
        <AuthNote tone="error">
          <p role="alert" className="text-sm leading-relaxed text-danger">
            {status === 'networkError' ? content.networkError : content.invalidCredentials}
          </p>
        </AuthNote>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="auth-submit landing-sheen px-5 text-base"
      >
        {status === 'submitting' ? content.submitting : content.submit}
      </button>

      <Link href="/sign-up" className="auth-link self-center text-sm">
        {content.switchToSignUp}
      </Link>
    </form>
  )
}
