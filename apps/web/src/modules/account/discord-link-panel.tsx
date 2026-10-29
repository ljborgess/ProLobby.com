'use client'

import { useState } from 'react'
import { DISCORD_BLURPLE, DiscordMark } from '@/common/ui/icons'
import { LogoMark } from '@/common/ui/logo'
import { useDiscordContent } from '@/hooks/use-discord-content'
import type { DiscordLinkStatus } from './discord-link-status'

/**
 * The Discord link screen — #149. Shows the two states, linked and not, and the
 * outcome of the last attempt.
 *
 * Linking is `apps/api`'s call: this only asks it where to send the person and
 * goes there. There is no unlink button, and that is deliberate (RF-082).
 */
export function DiscordLinkPanel({
  linked,
  status,
}: {
  linked: boolean
  status?: DiscordLinkStatus
}) {
  const content = useDiscordContent()
  const [working, setWorking] = useState(false)
  const [failure, setFailure] = useState<'unavailable' | 'error' | 'networkError'>()

  async function start() {
    setWorking(true)
    setFailure(undefined)

    let response: Response
    try {
      response = await fetch('/bff/accounts/me/discord-link/attempts', { method: 'POST' })
    } catch {
      setWorking(false)
      setFailure('networkError')
      return
    }

    if (!response.ok) {
      setWorking(false)
      setFailure(response.status === 503 ? 'unavailable' : 'error')
      return
    }

    // The only place this screen sends the person is Discord. Anything else,
    // or a body that is not JSON, is treated as a failure, never followed.
    let target: URL
    try {
      const { authorizationUrl } = (await response.json()) as { authorizationUrl: string }
      target = new URL(authorizationUrl)
    } catch {
      setWorking(false)
      setFailure('error')
      return
    }
    if (target.protocol !== 'https:' || target.hostname !== 'discord.com') {
      setWorking(false)
      setFailure('error')
      return
    }

    window.location.assign(target.toString())
  }

  const shown = failure ?? status
  const isSuccess = shown === 'linked'

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col items-center gap-4 text-center">
        {/* The mark, big, in Discord's own blurple while the link is still
            missing — it is the thing being recognised. Once linked it turns
            accent, because from then on the card reports our state, not
            theirs. */}
        {/* The link itself, drawn: our mark, a wire, theirs. Missing, the
            wire is a dashed gap waiting to be closed; linked, it is lit and
            a pulse crosses it once, from us to them. */}
        <div aria-hidden className={`discord-wire flex items-center ${linked ? 'is-linked' : ''}`}>
          <span className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-surface text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/6%)]">
            <LogoMark className="size-6" />
          </span>
          <span className="discord-wire-line relative mx-2 h-px w-14 sm:w-20" />
          <span
            className={`flex size-16 items-center justify-center rounded-full border ${
              linked ? 'border-accent/35 bg-accent/10 text-accent' : 'border-white/10 bg-white/5'
            }`}
            style={linked ? undefined : { color: DISCORD_BLURPLE }}
          >
            <DiscordMark className="size-8" />
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="landing-section-title font-display text-foreground">{content.title}</h1>
          <p className="text-sm leading-relaxed text-foreground-soft">{content.subtitle}</p>
        </div>
      </header>

      <div className="home-surface relative flex flex-col gap-2 overflow-hidden rounded-md border border-white/12 p-5">
        {!linked && (
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-accent/60 to-transparent"
          />
        )}
        <div className="relative flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-foreground">
            {linked ? content.linkedLabel : content.notLinkedLabel}
          </p>
          {/* Accent means "this is on you", the same as it does in the
              prerequisites panel — so it is the *pending* pill that lights up,
              not the linked one. Getting this backwards made the two screens
              disagree about what green means. */}
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.7rem] ${
              linked
                ? 'border-white/10 text-foreground-soft'
                : 'border-accent/30 bg-accent/10 text-accent'
            }`}
          >
            {!linked && (
              <span aria-hidden className="landing-dot size-1.5 rounded-full bg-accent" />
            )}
            {linked ? content.linkedState : content.notLinkedState}
          </span>
        </div>
        <p className="relative text-sm leading-relaxed text-foreground-soft">
          {linked ? content.linkedHint : content.notLinkedHint}
        </p>
      </div>

      {shown && (
        <p
          role={isSuccess ? 'status' : 'alert'}
          className={`rounded-sm border px-3 py-2 text-sm leading-relaxed ${
            isSuccess
              ? 'border-accent/25 bg-accent/10 text-foreground'
              : 'border-danger/25 bg-danger/10 text-danger'
          }`}
        >
          {content.statuses[shown]}
        </p>
      )}

      {!linked && (
        <button
          type="button"
          onClick={start}
          disabled={working}
          className="landing-focus landing-sheen inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-background transition-transform duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:hover:scale-100"
        >
          <DiscordMark className="size-4" />
          {working ? content.acting : content.action}
        </button>
      )}

      {/* The scope, stated where the decision is made. #149 asks for `identify`
          and nothing else, and the person deserves to read that before they
          leave for Discord rather than after. */}
      {!linked && (
        <p className="text-center text-xs leading-relaxed text-foreground-soft">
          {content.scopeNote}
        </p>
      )}
    </div>
  )
}
