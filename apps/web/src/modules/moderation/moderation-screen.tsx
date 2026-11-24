'use client'

import { useState } from 'react'
import { createBffCasesSource, createBffToolsSource } from './bff-source'
import { CasePanel } from './case-panel'
import type { VerificationCase } from './verification-queue'

/**
 * What `/moderation` shows: the panel of cases and management sections, read
 * from the API through `/bff/moderation/*` (#307, #312, #313), with the
 * character prints screen (#198) inside its Personagem filter.
 */
export function ModerationScreen({
  cases,
  archetypes,
}: {
  cases: VerificationCase[]
  archetypes: string[]
}) {
  // State, not a memo: React may drop a memoized value, and a source is a
  // long-lived object the panel's effects depend on.
  const [source] = useState(createBffCasesSource)
  const [tools] = useState(createBffToolsSource)

  return (
    <CasePanel
      source={source}
      tools={tools}
      // No endpoint says who is an admin (#313): every moderator sees Planos
      // and the API refuses the others with 403 `admin_only`, which the form
      // shows. Hiding it by role comes when the session carries the role.
      isAdmin
      verifications={cases}
      archetypes={archetypes}
    />
  )
}
