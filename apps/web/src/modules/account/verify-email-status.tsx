'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuthContent } from '@/hooks/use-auth-content'

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
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-semibold text-foreground">{content.title}</h1>
        <p role="status" className="text-sm text-foreground-soft">
          {content.verifying}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold text-foreground">{content.title}</h1>
      <p
        role={status === 'success' ? 'status' : 'alert'}
        className={`text-sm ${status === 'success' ? 'text-accent' : 'text-danger'}`}
      >
        {status === 'success'
          ? content.success
          : status === 'invalidToken'
            ? content.invalidToken
            : content.genericError}
      </p>
      <Link href="/login" className="text-sm text-foreground-soft underline">
        {content.goToSignIn}
      </Link>
    </div>
  )
}
