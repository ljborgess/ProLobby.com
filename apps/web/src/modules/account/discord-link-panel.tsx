'use client'

import { useState } from 'react'
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold text-foreground">{content.title}</h1>
        <p className="text-base text-foreground-soft">{content.subtitle}</p>
      </div>

      <div className="flex flex-col gap-1 rounded-sm border border-white/10 bg-surface px-4 py-3">
        <p className="text-base font-medium text-foreground">
          {linked ? content.linkedLabel : content.notLinkedLabel}
        </p>
        <p className="text-sm text-foreground-soft">
          {linked ? content.linkedHint : content.notLinkedHint}
        </p>
      </div>

      {shown && (
        <p
          role={isSuccess ? 'status' : 'alert'}
          className={isSuccess ? 'text-sm text-foreground' : 'text-sm text-danger'}
        >
          {content.statuses[shown]}
        </p>
      )}

      {!linked && (
        <button
          type="button"
          onClick={start}
          disabled={working}
          className="rounded-sm bg-accent px-4 py-3 text-base font-medium text-background disabled:opacity-60"
        >
          {working ? content.acting : content.action}
        </button>
      )}
    </div>
  )
}
