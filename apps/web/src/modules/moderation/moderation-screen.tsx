'use client'

import { BackAction } from '@/common/ui/back-action'
import { useModerationContent } from '@/hooks/use-moderation-content'
import { VerificationQueue, type VerificationCase } from './verification-queue'

export function ModerationScreen({
  cases,
  archetypes,
}: {
  cases: VerificationCase[] | 'forbidden'
  archetypes: string[]
}) {
  const content = useModerationContent()

  return (
    <div className="flex flex-col gap-6">
      <BackAction href="/verifications" label="ProLobby" />
      <header className="flex flex-col gap-1">
        <h1 className="landing-section-title font-display text-foreground">{content.title}</h1>
        <p className="text-sm leading-relaxed text-foreground-soft">{content.subtitle}</p>
      </header>
      {cases === 'forbidden' ? (
        <p role="alert" className="text-sm text-danger">
          {content.forbidden}
        </p>
      ) : (
        <VerificationQueue cases={cases} archetypes={archetypes} />
      )}
    </div>
  )
}
