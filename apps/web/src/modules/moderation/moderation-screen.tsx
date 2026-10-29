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

  // Not an error: an account without the role asked for a door it does not
  // have. Said plainly, with no alarm colour, and with the way back.
  if (cases === 'forbidden') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <span className="flex size-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-foreground-soft shadow-[inset_0_1px_0_rgb(255_255_255/6%)]">
          <WhistleMark className="size-8" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="landing-section-title font-display text-foreground">{content.title}</h1>
          <p className="text-sm leading-relaxed text-foreground-soft">{content.forbidden}</p>
        </div>
        <div className="flex justify-center">
          <BackAction href="/verifications" label={content.backHome} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="landing-section-title font-display text-foreground">{content.title}</h1>
        <p className="text-sm leading-relaxed text-foreground-soft">{content.subtitle}</p>
      </header>
      <VerificationQueue cases={cases} archetypes={archetypes} />
    </div>
  )
}

/** The referee's whistle, in hairline: the moderation's own mark. */
function WhistleMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="19" r="7" />
      <circle cx="12" cy="19" r="2.5" />
      <path d="M12 12h15v6h-8.1" />
      <path d="M7 14 4.5 9.5" />
    </svg>
  )
}
