'use client'

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
      <header className="flex flex-col gap-1">
        <h1 className="landing-section-title font-display text-foreground">{content.title}</h1>
        {cases !== 'forbidden' && (
          <p className="text-sm leading-relaxed text-foreground-soft">{content.subtitle}</p>
        )}
      </header>
      {/* Not an error: an account without the role asked for a door it does
          not have. Said plainly, with no alarm colour. */}
      {cases === 'forbidden' ? (
        <p className="text-sm text-foreground-soft">{content.forbidden}</p>
      ) : (
        <VerificationQueue cases={cases} archetypes={archetypes} />
      )}
    </div>
  )
}
