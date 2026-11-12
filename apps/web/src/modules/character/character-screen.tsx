'use client'

import { useCharacterContent } from '@/hooks/use-character-content'
import type { KitLook } from '@/modules/kit/kit-art'
import { CharacterFlow } from './character-flow'
import type { ArchetypeOption, CharacterView } from './types'

export function CharacterScreen({
  characters,
  archetypes,
  look = null,
}: {
  characters: CharacterView[]
  archetypes: ArchetypeOption[]
  /** The declared club's kit; null without a club. */
  look?: KitLook | null
}) {
  const content = useCharacterContent()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="landing-section-title font-display text-foreground">{content.title}</h1>
      </header>
      <CharacterFlow characters={characters} archetypes={archetypes} look={look} />
    </div>
  )
}
