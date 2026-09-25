'use client'

import { BackAction } from '@/common/ui/back-action'
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
      <BackAction href="/verifications" label={content.back} />
      <header className="flex flex-col gap-1">
        <h1 className="landing-section-title font-display text-foreground">{content.title}</h1>
      </header>
      <CharacterFlow characters={characters} archetypes={archetypes} />
    </div>
  )
}
