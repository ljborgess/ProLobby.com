'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAccountContent } from '@/hooks/use-account-content'

export interface QueuePrerequisites {
  emailVerified: boolean
  discordLinked: boolean
}

type Resend = 'idle' | 'sending' | 'sent' | 'error'

/**
 * What the person still has to do, on the logged-in home — issue #171.
 *
 * It informs and never blocks: the dossier's onboarding gives a fresh account
 * full browsing, and only the queue demands these (RF-002), in any arrival
 * order (RF-055). So this is a list with a way forward, not a wizard.
 */
export function QueuePrerequisitesPanel({ emailVerified, discordLinked }: QueuePrerequisites) {
  const content = useAccountContent()
  const [resend, setResend] = useState<Resend>('idle')

  async function resendVerification() {
    setResend('sending')

    try {
      const response = await fetch('/bff/accounts/me/verifications/resends', { method: 'POST' })
      setResend(response.ok ? 'sent' : 'error')
    } catch {
      setResend('error')
    }
  }

  return (
    <section aria-labelledby="next-steps" className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="next-steps" className="font-display text-2xl font-semibold text-foreground">
          {content.title}
        </h2>
        <p className="text-base text-foreground-soft">
          {emailVerified && discordLinked ? content.allDone : content.subtitle}
        </p>
      </div>

      <Step
        done={emailVerified}
        doneLabel={content.email.doneLabel}
        label={content.email.pendingLabel}
      >
        <p className="text-sm text-foreground-soft">{content.email.pendingHint}</p>
        {resend === 'sent' ? (
          <p role="status" className="text-sm text-foreground">
            {content.email.resent}
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={resendVerification}
              disabled={resend === 'sending'}
              className="self-start rounded-sm border border-white/10 px-4 py-2 text-sm font-medium text-foreground disabled:opacity-60"
            >
              {resend === 'sending' ? content.email.resending : content.email.resend}
            </button>
            {resend === 'error' && (
              <p role="alert" className="text-sm text-danger">
                {content.email.resendError}
              </p>
            )}
          </>
        )}
      </Step>

      <Step
        done={discordLinked}
        doneLabel={content.discord.doneLabel}
        label={content.discord.pendingLabel}
      >
        <p className="text-sm text-foreground-soft">{content.discord.pendingHint}</p>
        <Link
          href="/account/discord"
          className="self-start rounded-sm bg-accent px-4 py-2 text-sm font-medium text-background"
        >
          {content.discord.action}
        </Link>
      </Step>
    </section>
  )
}

/**
 * One prerequisite. The state is carried by the word "Concluído"/"Pendente",
 * never by colour alone (RNF-015), and the action only exists while it is
 * pending — there is nothing to do about a step already done.
 */
function Step({
  done,
  label,
  doneLabel,
  children,
}: {
  done: boolean
  label: string
  doneLabel: string
  children: React.ReactNode
}) {
  const content = useAccountContent()

  return (
    <div className="flex flex-col gap-2 rounded-sm border border-white/10 bg-surface px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-base font-medium text-foreground">{done ? doneLabel : label}</p>
        <span className={`text-sm ${done ? 'text-foreground-soft' : 'text-accent'}`}>
          {done ? content.done : content.pending}
        </span>
      </div>
      {!done && children}
    </div>
  )
}
