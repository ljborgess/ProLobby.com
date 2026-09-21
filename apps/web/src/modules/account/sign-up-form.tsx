'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { TextField } from '@/common/ui/text-field'
import { useAuthContent } from '@/hooks/use-auth-content'
import { CURRENT_TERMS_VERSION } from './terms-version'

const MIN_AGE_YEARS = 16
const MIN_PASSWORD_LENGTH = 12

interface FieldErrors {
  email?: string
  password?: string
  birthDate?: string
  securityQuestion?: string
  securityAnswer?: string
  acceptedTerms?: string
}

/** Mirrors RF-021: age is computed from the date typed, on the date typed. */
function isOldEnough(birthDate: string): boolean {
  const parsed = new Date(birthDate)
  if (Number.isNaN(parsed.getTime())) {
    return false
  }
  const cutoff = new Date(parsed)
  cutoff.setFullYear(cutoff.getFullYear() + MIN_AGE_YEARS)
  return cutoff.getTime() <= Date.now()
}

type Status = 'idle' | 'submitting' | 'submitted' | 'error'

/**
 * The sign-up form — RF-019, RF-070, issue #87.
 *
 * Client-side checks here are UX only, not the security boundary: every one
 * of them (email shape, password length, age) is re-validated by the API,
 * which is what actually decides. Skipping a check here only costs the
 * person a slower round trip, never lets bad data through.
 *
 * Success and failure show the *same* screen ("check your email") whenever
 * the API itself answers that way — RF-070 says a taken address must not be
 * distinguishable from a free one, and a form that reacted differently here
 * would defeat that no matter how careful the API is.
 */
export function SignUpForm() {
  const content = useAuthContent().signUp
  const [status, setStatus] = useState<Status>('idle')
  const [errors, setErrors] = useState<FieldErrors>({})

  function validate(data: FormData): FieldErrors {
    const email = String(data.get('email') ?? '')
    const password = String(data.get('password') ?? '')
    const birthDate = String(data.get('birthDate') ?? '')
    const securityQuestion = String(data.get('securityQuestion') ?? '')
    const securityAnswer = String(data.get('securityAnswer') ?? '')
    const acceptedTerms = data.get('acceptedTerms')

    const next: FieldErrors = {}
    if (!email) {
      next.email = content.fieldRequired
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = content.emailInvalid
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = content.passwordTooShort
    }
    if (!birthDate) {
      next.birthDate = content.fieldRequired
    } else if (!isOldEnough(birthDate)) {
      next.birthDate = content.ageTooYoung
    }
    // Same bounds as `SignUpDto` on the API (8 and 2): without them the API
    // answers 400 and the person sees only the generic failure message.
    if (!securityQuestion) {
      next.securityQuestion = content.fieldRequired
    } else if (securityQuestion.length < 8) {
      next.securityQuestion = content.securityQuestionTooShort
    }
    if (!securityAnswer) {
      next.securityAnswer = content.fieldRequired
    } else if (securityAnswer.length < 2) {
      next.securityAnswer = content.securityAnswerTooShort
    }
    if (!acceptedTerms) {
      next.acceptedTerms = content.fieldRequired
    }
    return next
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    const fieldErrors = validate(data)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) {
      return
    }

    setStatus('submitting')
    try {
      const response = await fetch('/bff/accounts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: data.get('email'),
          password: data.get('password'),
          birthDate: data.get('birthDate'),
          securityQuestion: data.get('securityQuestion'),
          securityAnswer: data.get('securityAnswer'),
          acceptedTermsVersion: CURRENT_TERMS_VERSION,
          website: data.get('website'),
        }),
      })

      // 202 (created or address already taken, RF-070) and 503 (signup
      // paused near the free-tier ceiling, RF-072) both land the person on
      // the same screen: neither is a validation problem with what they
      // typed, and the two must read identically for RF-070 to hold.
      setStatus(response.ok || response.status === 503 ? 'submitted' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'submitted') {
    return (
      <p role="status" className="text-base text-foreground">
        {content.checkYourEmail}
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} method="post" noValidate className="relative flex flex-col gap-4">
      {/*
       * Honeypot — item 12 of the security checklist, issue #101. Hidden
       * with CSS, never removed from the markup: a person never sees or
       * tabs into it, but a script that fills every input it finds fills
       * this one too. `aria-hidden` + `tabIndex={-1}` keep it out of a
       * screen reader's and a keyboard user's way; `autoComplete="off"`
       * stops a browser from offering to fill it for a real person.
       */}
      <div className="absolute -left-full h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <TextField
        name="email"
        type="email"
        autoComplete="email"
        label={content.emailLabel}
        error={errors.email}
      />
      <TextField
        name="password"
        type="password"
        autoComplete="new-password"
        label={content.passwordLabel}
        hint={content.passwordHint}
        error={errors.password}
      />
      <TextField
        name="birthDate"
        type="date"
        autoComplete="bday"
        label={content.birthDateLabel}
        error={errors.birthDate}
      />
      <TextField
        name="securityQuestion"
        type="text"
        label={content.securityQuestionLabel}
        hint={content.securityQuestionHint}
        error={errors.securityQuestion}
      />
      {/*
       * autoComplete off: the answer is a credential, not a profile field —
       * it is one of the two factors that recover an account without email or
       * Discord (RF-025). Letting a browser save and replay it puts the
       * recovery path behind whatever protects that browser profile.
       */}
      <TextField
        name="securityAnswer"
        type="text"
        autoComplete="off"
        label={content.securityAnswerLabel}
        error={errors.securityAnswer}
      />
      <label className="flex items-start gap-2 text-sm text-foreground-soft">
        <input
          type="checkbox"
          name="acceptedTerms"
          aria-invalid={errors.acceptedTerms ? true : undefined}
          className="mt-1 h-5 w-5 shrink-0 accent-accent"
        />
        <span>{content.acceptTerms}</span>
      </label>
      {errors.acceptedTerms && (
        <p role="alert" className="text-sm text-danger">
          {errors.acceptedTerms}
        </p>
      )}

      {status === 'error' && (
        <p role="alert" className="text-sm text-danger">
          {content.genericError}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded-sm bg-accent px-4 py-3 text-base font-medium text-background disabled:opacity-60"
      >
        {status === 'submitting' ? content.submitting : content.submit}
      </button>

      <Link href="/login" className="text-sm text-foreground-soft underline">
        {content.switchToSignIn}
      </Link>
    </form>
  )
}
