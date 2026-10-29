'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuthContent } from '@/hooks/use-auth-content'
import { AuthHeading, AuthNote } from './auth-layout'

type Status = 'verifying' | 'success' | 'invalidToken' | 'error'

/**
 * Consumes the verification token from the emailed link — RF-002, 2026-09-23
 * review.
 *
 * The API route is a `POST` on purpose (a `GET` that changes state would be
 * reachable from any link the person clicks elsewhere), so this fires the
 * request itself on mount instead of being a link the person clicks — the
 * click already happened, in the email.
 */
export function VerifyEmailStatus() {
  const content = useAuthContent().verifyEmail
  const token = useSearchParams().get('token') ?? ''
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'invalidToken')

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false

    async function verify() {
      try {
        const response = await fetch('/bff/accounts/verifications', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        if (cancelled) {
          return
        }
        if (response.status === 204) {
          setStatus('success')
          return
        }
        setStatus(response.status === 400 ? 'invalidToken' : 'error')
      } catch {
        if (!cancelled) {
          setStatus('error')
        }
      }
    }

    void verify()

    return () => {
      cancelled = true
    }
  }, [token])

  if (status === 'verifying') {
    return (
      <div className="flex flex-col gap-7">
        <AuthHeading title={content.title} />
        <div className="flex items-center gap-3">
          {/* The panel's radar, at the size of a mark: the link is being
              read. Under reduced motion the sweep holds still. */}
          <span
            aria-hidden
            className="relative size-6 shrink-0 rounded-full border border-accent/30"
          >
            <span className="landing-radar absolute inset-0" />
          </span>
          <p role="status" className="text-sm text-foreground-soft">
            {content.verifying}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-7">
      <AuthHeading title={content.title} />
      <div className="flex flex-col gap-5">
        <AuthNote tone={status === 'success' ? 'confirmed' : 'error'}>
          <p
            role={status === 'success' ? 'status' : 'alert'}
            className={`text-sm leading-relaxed ${status === 'success' ? 'text-foreground' : 'text-danger'}`}
          >
            {status === 'success'
              ? content.success
              : status === 'invalidToken'
                ? content.invalidToken
                : content.genericError}
          </p>
        </AuthNote>
        {/* A dead link: the resend lives on the account home (behind the login,
            which takes over if the session is gone). A network failure is not
            a dead link, so it keeps the way to the login. */}
        {status !== 'invalidToken' ? (
          <Link href="/login" className="auth-link self-start text-sm">
            {content.goToSignIn}
          </Link>
        ) : (
          <Link href="/verifications" className="auth-link self-start text-sm">
            {content.requestNew}
          </Link>
        )}
      </div>
    </div>
  )
}
