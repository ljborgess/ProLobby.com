'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { TextField } from '@/common/ui/text-field'
import { useTwoFactorContent } from '@/hooks/use-two-factor-content'
import { AuthNote } from '@/modules/account/auth-layout'

type Setup = { secret: string; otpauthUrl: string }
type Status = 'idle' | 'busy' | 'invalid' | 'error'

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
    setStatus(response && response.status < 500 ? 'invalid' : 'error')
  }

  return (
    <section className="flex flex-col gap-5">
      <Heading title={content.verifyTitle} intro={content.verifyIntro} />
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <CodeField label={content.codeLabel} hint={content.codeHint} />
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

  async function start() {
    setStatus('busy')
    const response = await post('/bff/accounts/me/two-factor/setup')
    if (!response?.ok) return setStatus('error')
    setSetup((await response.json()) as Setup)
    setStatus('idle')
  }

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = String(new FormData(event.currentTarget).get('code') ?? '').trim()
    setStatus('busy')
    const response = await post('/bff/accounts/me/two-factor/activation', { code })
    if (!response?.ok) return setStatus(response && response.status < 500 ? 'invalid' : 'error')
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
        <>
          <Feedback status={status} />
          <button
            type="button"
            onClick={start}
            disabled={status === 'busy'}
            className="auth-submit px-5 text-base"
          >
            {status === 'busy' ? content.starting : content.start}
          </button>
        </>
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

function CodeField({ label, hint }: { label: string; hint: string }) {
  return (
    <TextField
      name="code"
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      label={label}
      hint={hint}
      maxLength={9}
    />
  )
}

function Feedback({ status }: { status: Status }) {
  const content = useTwoFactorContent()
  if (status !== 'invalid' && status !== 'error') return null
  return (
    <AuthNote tone="error">
      <p role="alert" className="text-sm leading-relaxed text-danger">
        {status === 'invalid' ? content.invalidCode : content.error}
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
