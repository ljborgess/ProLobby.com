'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { TextField } from '@/common/ui/text-field'
import { useTwoFactorContent } from '@/hooks/use-two-factor-content'
import { AuthNote } from '@/modules/account/auth-layout'

type Setup = { secret: string; otpauthUrl: string }
type Status = 'idle' | 'busy' | 'invalid' | 'invalidEnrollment' | 'tooMany' | 'error'

/**
 * What an answer means on this screen. A 409 (the factor got enabled in
 * another tab) and a 401 (the session ended) both resolve by loading the page
 * again, which lands on the right step.
 */
function outcomeOf(response: Response | undefined, invalid: Status): Status | 'reload' {
  if (!response) return 'error'
  if (response.status === 429) return 'tooMany'
  if (response.status === 409 || response.status === 401) return 'reload'
  return response.status < 500 ? invalid : 'error'
}

/**
 * The panel's second factor — #311. Two paths: a moderator without the
 * factor sets it up (secret, first code, recovery codes shown once); one with
 * it types today's code. Either way the API answers with an upgraded session
 * cookie, and the panel opens.
 */
export function TwoFactorScreen({ enabled }: { enabled: boolean }) {
  return enabled ? <VerifyCode /> : <SetUp />
}

function VerifyCode() {
  const content = useTwoFactorContent()
  const router = useRouter()
  const [status, setStatus] = useState<Status>('idle')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = String(new FormData(event.currentTarget).get('code') ?? '').trim()
    setStatus('busy')
    const response = await post('/bff/sessions/two-factor', { code })
    if (response?.ok) {
      router.replace('/moderation')
      router.refresh()
      return
    }
    settle(outcomeOf(response, 'invalid'))
  }

  function settle(outcome: Status | 'reload') {
    if (outcome === 'reload') return router.refresh()
    setStatus(outcome)
  }

  return (
    <section className="flex flex-col gap-5">
      <Heading title={content.verifyTitle} intro={content.verifyIntro} />
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {/* Letters too: a recovery code is `xxxx-xxxx`. */}
        <CodeField label={content.codeLabel} hint={content.codeHint} numeric={false} />
        <Feedback status={status} />
        <button type="submit" disabled={status === 'busy'} className="auth-submit px-5 text-base">
          {status === 'busy' ? content.verifying : content.verify}
        </button>
      </form>
    </section>
  )
}

function SetUp() {
  const content = useTwoFactorContent()
  const router = useRouter()
  const [setup, setSetup] = useState<Setup>()
  const [codes, setCodes] = useState<string[]>()
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<Status>('idle')

  function settle(outcome: Status | 'reload') {
    if (outcome === 'reload') return router.refresh()
    setStatus(outcome)
  }

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const enrollmentCode = String(new FormData(event.currentTarget).get('enrollment') ?? '').trim()
    setStatus('busy')
    const response = await post('/bff/accounts/me/two-factor/setup', { enrollmentCode })
    if (!response?.ok) return settle(outcomeOf(response, 'invalidEnrollment'))
    setSetup((await response.json()) as Setup)
    setStatus('idle')
  }

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = String(new FormData(event.currentTarget).get('code') ?? '').trim()
    setStatus('busy')
    const response = await post('/bff/accounts/me/two-factor/activation', { code })
    if (!response?.ok) return settle(outcomeOf(response, 'invalid'))
    setCodes(((await response.json()) as { recoveryCodes: string[] }).recoveryCodes)
    setStatus('idle')
  }

  if (codes) {
    return (
      <section className="flex flex-col gap-5">
        <Heading title={content.recoveryTitle} intro={content.recoveryIntro} />
        <ol className="grid grid-cols-2 gap-2 rounded-md border border-white/12 bg-surface p-4 font-mono text-sm text-foreground">
          {codes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(codes.join('\n')).then(() => setCopied(true))
          }}
          className="auth-link self-start text-sm"
        >
          {copied ? content.copied : content.copy}
        </button>
        <label className="flex items-center gap-2.5 text-sm text-foreground-soft">
          <input
            type="checkbox"
            checked={saved}
            onChange={(event) => setSaved(event.target.checked)}
            className="h-5 w-5 accent-accent [color-scheme:dark]"
          />
          {content.savedConfirm}
        </label>
        <button
          type="button"
          disabled={!saved}
          onClick={() => {
            router.replace('/moderation')
            router.refresh()
          }}
          className="auth-submit px-5 text-base"
        >
          {content.enterPanel}
        </button>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-5">
      <Heading title={content.setupTitle} intro={content.setupIntro} />
      {!setup ? (
        <form onSubmit={start} className="flex flex-col gap-4" noValidate>
          <TextField
            name="enrollment"
            type="text"
            autoComplete="off"
            label={content.enrollmentLabel}
            hint={content.enrollmentHint}
            maxLength={9}
          />
          <Feedback status={status} />
          <button type="submit" disabled={status === 'busy'} className="auth-submit px-5 text-base">
            {status === 'busy' ? content.starting : content.start}
          </button>
        </form>
      ) : (
        <form onSubmit={activate} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-foreground-soft">{content.secretLabel}</span>
            <code className="break-all rounded-md border border-white/12 bg-surface px-3 py-2 font-mono text-sm tracking-wider text-foreground">
              {setup.secret.match(/.{1,4}/g)?.join(' ')}
            </code>
            <a href={setup.otpauthUrl} className="auth-link self-start text-sm">
              {content.openInApp}
            </a>
          </div>
          <CodeField label={content.codeLabel} hint={content.codeHint} />
          <Feedback status={status} />
          <button type="submit" disabled={status === 'busy'} className="auth-submit px-5 text-base">
            {status === 'busy' ? content.activating : content.activate}
          </button>
        </form>
      )}
    </section>
  )
}

function Heading({ title, intro }: { title: string; intro: string }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="landing-section-title font-display text-foreground">{title}</h1>
      <p className="text-sm leading-relaxed text-foreground-soft">{intro}</p>
    </header>
  )
}

function CodeField({
  label,
  hint,
  numeric = true,
}: {
  label: string
  hint: string
  numeric?: boolean
}) {
  return (
    <TextField
      name="code"
      type="text"
      inputMode={numeric ? 'numeric' : 'text'}
      autoComplete="one-time-code"
      label={label}
      hint={hint}
      maxLength={9}
    />
  )
}

function Feedback({ status }: { status: Status }) {
  const content = useTwoFactorContent()
  const message = {
    invalid: content.invalidCode,
    invalidEnrollment: content.invalidEnrollment,
    tooMany: content.tooMany,
    error: content.error,
  }[status as 'invalid' | 'invalidEnrollment' | 'tooMany' | 'error']
  if (!message) return null
  return (
    <AuthNote tone="error">
      <p role="alert" className="text-sm leading-relaxed text-danger">
        {message}
      </p>
    </AuthNote>
  )
}

/** A JSON POST to the same-origin proxy; `undefined` when the network failed. */
async function post(url: string, body?: unknown): Promise<Response | undefined> {
  try {
    return await fetch(url, {
      method: 'POST',
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    return undefined
  }
}
