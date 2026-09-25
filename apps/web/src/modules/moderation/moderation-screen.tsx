'use client'

import Link from 'next/link'
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
      <Link
        href="/verifications"
        className="landing-focus self-start text-sm text-foreground-soft underline"
      >
        ← ProLobby
      </Link>
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
