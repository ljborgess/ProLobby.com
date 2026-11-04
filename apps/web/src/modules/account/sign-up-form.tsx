'use client'

import { useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { SelectField } from '@/common/ui/select-field'
import { TextField } from '@/common/ui/text-field'
import { useAuthContent } from '@/hooks/use-auth-content'
import { AuthHeading, AuthNote } from './auth-layout'
import { SignUpHeading } from './sign-up-heading'
import { TermsDialogLink } from './terms'
import { CURRENT_TERMS_VERSION } from './terms-version'

/** Group names in the Label role: small caps, wide tracking, like a panel. */
const LEGEND = 'mb-2.5 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-foreground-soft'

const MIN_AGE_YEARS = 16
const MIN_PASSWORD_LENGTH = 12
/** The API's maximums (`SignUpDto`): the field stops there instead of a 400. */
const MAX_EMAIL = 320
const MAX_PASSWORD = 128
const MAX_SECURITY_TEXT = 200
const CUSTOM_QUESTION = 'custom'

interface FieldErrors {
  email?: string
  password?: string
  birthDate?: string
  securityQuestion?: string
  securityAnswer?: string
  acceptedTerms?: string
}

/** YYYY-MM-DD in local time, `years` before today. */
function yearsAgo(years: number): string {
  const today = new Date()
  const date = new Date(today.getFullYear() - years, today.getMonth(), today.getDate())
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Mirrors RF-021: 16 or older on the date typed. Compared as YYYY-MM-DD
 * strings in local time — `new Date('YYYY-MM-DD')` is UTC midnight, which in
 * Brazil let a birthday through three hours early.
 */
function isOldEnough(birthDate: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(birthDate) && birthDate <= yearsAgo(MIN_AGE_YEARS)
}

type Status = 'idle' | 'submitting' | 'submitted' | 'error'

/**
 * The sign-up form — RF-019, RF-070, issue #87, and the sign-up critique of
 * 2026-11-03.
 *
 * Client-side checks here are UX only, not the security boundary: every one
 * of them (email shape, password length, age) is re-validated by the API,
 * which is what actually decides. Skipping a check here only costs the
 * person a slower round trip, never lets bad data through.
 *
 * A failed submit says how many fields need attention once, then puts the
 * keyboard on the first of them; each error stays tied to its field and goes
 * away as soon as that field changes.
 *
 * Success and failure show the *same* screen ("check your email") whenever
 * the API itself answers that way — RF-070 says a taken address must not be
 * distinguishable from a free one. Showing back the address the person typed
 * reveals nothing they did not just write, and is how a typo gets caught.
 */
export function SignUpForm() {
  const { signUp: content, revealPassword } = useAuthContent()
  const [status, setStatus] = useState<Status>('idle')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [question, setQuestion] = useState('')
  const [sentTo, setSentTo] = useState('')
  const form = useRef<HTMLFormElement>(null)
  const errorCount = Object.keys(errors).length

  function validate(data: FormData): FieldErrors {
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    const birthDate = String(data.get('birthDate') ?? '')
    const securityQuestion = questionOf(data)
    const securityAnswer = String(data.get('securityAnswer') ?? '').trim()

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
    // Same bounds as `SignUpDto` on the API (8 and 2, after trimming):
    // without them the API answers 400 and the person sees only the generic
    // failure message.
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
    if (!data.get('acceptedTerms')) {
      next.acceptedTerms = content.fieldRequired
    }
    return next
  }

  /** The ready-made question picked, or the one written by hand. */
  function questionOf(data: FormData): string {
    const picked = String(data.get('securityQuestionPick') ?? '')
    if (picked === CUSTOM_QUESTION) {
      return String(data.get('securityQuestion') ?? '').trim()
    }
    return picked
  }

  /** A field that changes drops its own error; the others stay. */
  function clearError(name: string) {
    const key = (name === 'securityQuestionPick' ? 'securityQuestion' : name) as keyof FieldErrors
    if (errors[key]) {
      setErrors((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    const fieldErrors = validate(data)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) {
      // After the render that marks them: the keyboard lands on the first.
      requestAnimationFrame(() => {
        form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      })
      return
    }

    const email = String(data.get('email')).trim()
    setStatus('submitting')
    try {
      const response = await fetch('/bff/accounts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          password: data.get('password'),
          birthDate: data.get('birthDate'),
          securityQuestion: questionOf(data),
          securityAnswer: String(data.get('securityAnswer')).trim(),
          acceptedTermsVersion: CURRENT_TERMS_VERSION,
          website: data.get('website'),
        }),
      })

      // 202 (created or address already taken, RF-070) and 503 (signup
      // paused near the free-tier ceiling, RF-072) both land the person on
      // the same screen: neither is a validation problem with what they
      // typed, and the two must read identically for RF-070 to hold.
      if (response.ok || response.status === 503) {
        setSentTo(email)
        setStatus('submitted')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  const sent = status === 'submitted'

  return (
    <>
      {sent ? (
        <>
          <AuthHeading title={content.sentTitle} />
          {/* Waiting, never confirmed: a taken address lands here too (RF-070). */}
          <AuthNote tone="waiting">
            <p role="status" className="text-base leading-relaxed text-foreground">
              {content.sentTo(sentTo)}
            </p>
          </AuthNote>
          <p className="mt-4 text-sm leading-relaxed text-foreground-soft">{content.sentSpam}</p>
          <div className="mt-8 flex flex-col gap-3">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-foreground-soft">
              {content.nextStepsTitle}
            </p>
            <ol className="flex flex-col gap-2">
              {content.nextSteps.map((step, index) => (
                <li key={step} className="flex items-center gap-3 text-sm text-foreground">
                  <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/25 text-xs font-semibold tabular-nums text-foreground-soft"
                  >
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className="auth-link mt-8 self-start text-sm"
          >
            {content.sentWrongEmail}
          </button>
        </>
      ) : (
        <SignUpHeading />
      )}
      {/* Kept mounted while the "check your email" screen shows: "I typed the
          wrong address" comes back to what was typed, not to a blank form. */}
      <form
        ref={form}
        hidden={sent}
        onSubmit={handleSubmit}
        onChange={(event) => {
          const target = event.target
          if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) {
            clearError(target.name)
          }
        }}
        method="post"
        noValidate
        className="relative flex flex-col gap-5"
      >
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

        {/* One announcement per failed submit; the fields carry the detail. */}
        <p role="alert" className={errorCount ? 'text-sm font-medium text-danger' : 'sr-only'}>
          {errorCount ? content.errorSummary(errorCount) : ''}
        </p>

        {/* Two groups instead of one column of six: what you sign in with, and
            what gets you back in when the e-mail is gone. */}
        <fieldset className="flex flex-col gap-3">
          <legend className={LEGEND}>{content.accessGroup}</legend>
          <TextField
            name="email"
            type="email"
            autoComplete="email"
            maxLength={MAX_EMAIL}
            aria-required
            announce={false}
            label={content.emailLabel}
            error={errors.email}
          />
          <TextField
            name="password"
            type="password"
            autoComplete="new-password"
            maxLength={MAX_PASSWORD}
            aria-required
            announce={false}
            label={content.passwordLabel}
            hint={content.passwordHint}
            error={errors.password}
            revealLabel={revealPassword}
          />
          {/* `max` opens a phone's picker near a plausible year, not on today. */}
          <TextField
            name="birthDate"
            type="date"
            autoComplete="bday"
            min="1900-01-01"
            max={yearsAgo(MIN_AGE_YEARS)}
            aria-required
            announce={false}
            label={content.birthDateLabel}
            hint={content.birthDateHint}
            error={errors.birthDate}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className={LEGEND}>{content.recoveryGroup}</legend>
          <SelectField
            name="securityQuestionPick"
            label={content.securityQuestionLabel}
            hint={question === CUSTOM_QUESTION ? undefined : content.securityQuestionWhy}
            placeholder={content.securityQuestionPick}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            options={[
              ...content.securityQuestions.map((text) => ({ value: text, label: text })),
              { value: CUSTOM_QUESTION, label: content.securityQuestionCustom },
            ]}
            aria-required
            announce={false}
            error={question === CUSTOM_QUESTION ? undefined : errors.securityQuestion}
          />
          {question === CUSTOM_QUESTION && (
            <TextField
              name="securityQuestion"
              type="text"
              maxLength={MAX_SECURITY_TEXT}
              aria-required
              announce={false}
              label={content.securityQuestionCustomLabel}
              hint={content.securityQuestionHint}
              error={errors.securityQuestion}
            />
          )}
          {/*
           * autoComplete off: the answer is a credential, not a profile field —
           * it is one of the two factors that recover an account without email
           * or Discord (RF-025). Letting a browser save and replay it puts the
           * recovery path behind whatever protects that browser profile.
           */}
          <TextField
            name="securityAnswer"
            type="text"
            autoComplete="off"
            maxLength={MAX_SECURITY_TEXT}
            aria-required
            announce={false}
            label={content.securityAnswerLabel}
            error={errors.securityAnswer}
          />
        </fieldset>

        <div className="flex flex-col gap-1">
          {/* The button that opens the Terms sits outside the <label>: a control
              inside a label competes for its name, and a click on it would tick
              the box. The checkbox reads the whole sentence through
              aria-labelledby. */}
          <div className="-my-1 flex items-start gap-2.5 py-1 text-sm text-foreground-soft">
            <input
              id="accepted-terms"
              type="checkbox"
              name="acceptedTerms"
              aria-required
              aria-labelledby="accepted-terms-label accepted-terms-link accepted-terms-end"
              aria-invalid={errors.acceptedTerms ? true : undefined}
              aria-describedby={errors.acceptedTerms ? 'accepted-terms-error' : undefined}
              className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-accent [color-scheme:dark]"
            />
            <span>
              <label
                id="accepted-terms-label"
                htmlFor="accepted-terms"
                className="cursor-pointer transition-colors hover:text-foreground"
              >
                {content.acceptTermsBefore}
              </label>
              <TermsDialogLink id="accepted-terms-link" label={content.termsLink} />
              <span id="accepted-terms-end">{content.acceptTermsAfter}</span>
            </span>
          </div>
          {errors.acceptedTerms && (
            <p id="accepted-terms-error" className="pl-7 text-xs text-danger">
              {errors.acceptedTerms}
            </p>
          )}
        </div>

        {status === 'error' && (
          <AuthNote tone="error">
            <p role="alert" className="text-sm leading-relaxed text-danger">
              {content.genericError}
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

        <Link href="/login" className="auth-link self-center text-sm">
          {content.switchToSignIn}
        </Link>
      </form>
    </>
  )
}
