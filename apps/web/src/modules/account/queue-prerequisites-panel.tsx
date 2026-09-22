'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CheckMark, DISCORD_BLURPLE, DiscordMark, MailMark } from '@/common/ui/icons'
import { useAccountContent } from '@/hooks/use-account-content'

export interface QueuePrerequisites {
  emailVerified: boolean
  discordLinked: boolean
}

type Resend = 'idle' | 'sending' | 'sent' | 'error'

/**
 * What the person still has to do before the queue will take them — issue
 * #171, reskinned 2026-09-22.
 *
 * It informs and never blocks: the dossier's onboarding gives a fresh account
 * full browsing, and only the queue demands these (RF-002), in any arrival
 * order (RF-055). So this is a list with a way forward, not a wizard.
 *
 * Every state is carried by a word before it is carried by anything else
 * (RNF-015): "Concluído" / "Pendente" is the source of truth, the tick and the
 * accent ring only agree with it. Someone who cannot tell the green from the
 * grey still reads the same screen.
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

  const steps = [emailVerified, discordLinked]
  const doneCount = steps.filter(Boolean).length
  const allDone = doneCount === steps.length

  return (
    <section aria-labelledby="next-steps" className="flex w-full flex-col gap-5">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="next-steps" className="landing-section-title font-display text-foreground">
              {content.title}
            </h2>
            <p className="text-sm leading-relaxed text-foreground-soft">
              {allDone ? content.allDone : content.subtitle}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs tabular-nums text-foreground-soft">
            {doneCount}/{steps.length}
          </span>
        </div>

        {/* The same count, as a bar. It repeats the number beside it on
            purpose — the number is the accessible truth, the bar is the one
            that reads at a glance. */}
        <div aria-hidden className="flex gap-2">
          {steps.map((done, index) => (
            <span
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors ${
                done
                  ? 'bg-accent shadow-[0_0_12px_color-mix(in_srgb,var(--color-accent)_45%,transparent)]'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </header>

      <Step
        done={emailVerified}
        doneLabel={content.email.doneLabel}
        label={content.email.pendingLabel}
        icon={<MailMark className="size-5" />}
      >
        <p className="text-sm leading-relaxed text-foreground-soft">{content.email.pendingHint}</p>
        {resend === 'sent' ? (
          <p role="status" className="text-sm text-accent">
            {content.email.resent}
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={resendVerification}
              disabled={resend === 'sending'}
              className="landing-focus self-start rounded-full border border-white/15 px-4 py-2 text-sm text-foreground-soft transition-colors hover:border-white/35 hover:text-foreground disabled:opacity-60"
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
        icon={<DiscordMark className="size-5" />}
        brandIcon
      >
        <p className="text-sm leading-relaxed text-foreground-soft">
          {content.discord.pendingHint}
        </p>
        <Link
          href="/account/discord"
          className="landing-focus landing-sheen inline-flex items-center gap-2 self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-background transition-transform duration-200 hover:scale-[1.03] active:scale-95"
        >
          <DiscordMark className="size-4" />
          {content.discord.action}
        </Link>
      </Step>
    </section>
  )
}

/**
 * One prerequisite, as a card.
 *
 * `brandIcon` keeps Discord's mark in Discord's own blurple while it is still
 * pending, because that is the thing being recognised. Once the step is done
 * the mark drops back to the accent with the rest of the card: at that point
 * what the row reports is our state, not their service.
 */
function Step({
  done,
  label,
  doneLabel,
  icon,
  brandIcon = false,
  children,
}: {
  done: boolean
  label: string
  doneLabel: string
  icon: React.ReactNode
  brandIcon?: boolean
  children: React.ReactNode
}) {
  const content = useAccountContent()

  return (
    <div
      className={`landing-card relative flex gap-4 overflow-hidden rounded-md border px-4 py-4 ${
        done ? 'border-white/8' : 'border-white/12'
      }`}
    >
      {/* Two marks that only the pending card carries: a rail down the left
          edge and a wash behind the medallion. They are what makes "this one
          is waiting on you" readable before any word is. */}
      {!done && (
        <>
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-accent/60 to-transparent"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -left-10 -top-10 size-32 rounded-full bg-accent/10 blur-2xl"
          />
        </>
      )}

      <span
        className={`relative flex size-11 shrink-0 items-center justify-center rounded-full border ${
          done
            ? 'border-accent/30 bg-accent/10 text-accent'
            : 'border-white/12 bg-white/5 shadow-[inset_0_1px_0_0_rgb(255_255_255/8%)]'
        }`}
        style={!done && brandIcon ? { color: DISCORD_BLURPLE } : undefined}
      >
        {done ? <CheckMark className="size-5" /> : icon}
      </span>

      <div className="relative flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-sm font-medium ${done ? 'text-foreground-soft' : 'text-foreground'}`}>
            {done ? doneLabel : label}
          </p>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.7rem] ${
              done
                ? 'border-white/10 text-foreground-soft'
                : 'border-accent/30 bg-accent/10 text-accent'
            }`}
          >
            {!done && <span aria-hidden className="landing-dot size-1.5 rounded-full bg-accent" />}
            {done ? content.done : content.pending}
          </span>
        </div>
        {!done && children}
      </div>
    </div>
  )
}
