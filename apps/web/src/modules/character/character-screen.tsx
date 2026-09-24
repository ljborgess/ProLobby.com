'use client'

import Link from 'next/link'
import { useCharacterContent } from '@/hooks/use-character-content'
import { CharacterFlow } from './character-flow'
import type { ArchetypeOption, CharacterView } from './types'

export function CharacterScreen({
  characters,
  archetypes,
}: {
  characters: CharacterView[]
  archetypes: ArchetypeOption[]
}) {
  const content = useCharacterContent()

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/verifications"
        className="landing-focus self-start text-sm text-foreground-soft underline"
      >
        {content.back}
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="landing-section-title font-display text-foreground">{content.title}</h1>
        <p className="text-sm leading-relaxed text-foreground-soft">{content.subtitle}</p>
      </header>
      <CharacterFlow characters={characters} archetypes={archetypes} />
    </div>
  )
}
