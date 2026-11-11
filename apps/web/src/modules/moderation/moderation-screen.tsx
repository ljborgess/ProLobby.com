'use client'

import { useMemo } from 'react'
import { useModerationContent } from '@/hooks/use-moderation-content'
import { CasePanel } from './case-panel'
import { createSampleSource } from './sample-cases'
import { VerificationQueue, type VerificationCase } from './verification-queue'

/**
 * What `/moderation` shows. `panel` says where the case queue comes from:
 * `sample` (made-up cases, only outside production, until the API of #307 is
 * on `dev`) or `null` (no queue: the character prints screen alone, as
 * before #309).
 */
export function ModerationScreen({
  cases,
  archetypes,
  panel,
}: {
  cases: VerificationCase[]
  archetypes: string[]
  panel: 'sample' | null
}) {
  const content = useModerationContent()
  const sampleSource = useMemo(() => (panel === 'sample' ? createSampleSource() : null), [panel])

  if (sampleSource) {
    return <CasePanel source={sampleSource} verifications={cases} archetypes={archetypes} sample />
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
