'use client'

import { useState } from 'react'
import { useCharacterContent } from '@/hooks/use-character-content'
import { CharacterForm } from './character-form'
import { PrintUpload } from './print-upload'
import { archetypeLabel, type ArchetypeOption, type CharacterView } from './types'

/**
 * Create a character, then send its print — or send the print of one already
 * created and still pending. Verified characters are listed, not re-sent.
 */
export function CharacterFlow({
  characters: initial,
  archetypes,
}: {
  characters: CharacterView[]
  archetypes: ArchetypeOption[]
}) {
  const content = useCharacterContent()
  const [characters, setCharacters] = useState(initial)
  const [sendingFor, setSendingFor] = useState<string | null>(null)
  const [creating, setCreating] = useState(initial.length === 0)

  if (sendingFor) {
    return <PrintUpload characterId={sendingFor} />
  }

  return (
    <div className="flex flex-col gap-6">
      {characters.length > 0 && (
        <section aria-labelledby="existing-characters" className="flex flex-col gap-3">
          <h2 id="existing-characters" className="text-base font-medium text-foreground">
            {content.existing.heading}
          </h2>
          <ul className="flex flex-col gap-2">
            {characters.map((character) => (
              <li
                key={character.id}
                className="flex items-center justify-between gap-3 rounded-md border border-white/10 px-4 py-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {content.categories[character.category]} · {archetypeLabel(character.archetype)}
                  </span>
                  <span className="text-xs text-foreground-soft">
                    {character.state === 'verified'
                      ? content.existing.verified
                      : content.existing.pending}
                  </span>
                </div>
                {character.state === 'pending_verification' && (
                  <button
                    type="button"
                    onClick={() => setSendingFor(character.id)}
                    className="landing-focus shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-background"
                  >
                    {content.existing.sendPrint}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="landing-focus self-start text-sm text-foreground-soft underline"
            >
              {content.existing.newCharacter}
            </button>
          )}
        </section>
      )}

      {creating && (
        <CharacterForm
          archetypes={archetypes}
          onCreated={(character) => {
            setCharacters((current) => [
              ...current.filter((item) => item.category !== character.category),
              character,
            ])
            setSendingFor(character.id)
          }}
        />
      )}
    </div>
  )
}
