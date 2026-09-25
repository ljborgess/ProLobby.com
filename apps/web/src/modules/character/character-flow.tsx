'use client'

import { useState } from 'react'
import { useCharacterContent } from '@/hooks/use-character-content'
import { CharacterForm } from './character-form'
import { PrintUpload } from './print-upload'
import type { CharacterCategory } from '@/content/character'
import { Roster } from './roster'
import type { ArchetypeOption, CharacterView } from './types'

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
  // null: no form open. '' or a category: the form, preset to the slot clicked.
  const [creating, setCreating] = useState<CharacterCategory | '' | null>(
    initial.length === 0 ? '' : null,
  )

  if (sendingFor) {
    return (
      <PrintUpload
        characterId={sendingFor}
        onBack={(received) => {
          if (received) {
            setCharacters((current) =>
              current.map((item) =>
                item.id === sendingFor
                  ? { ...item, lastPrint: { status: 'received', rejection: null } }
                  : item,
              ),
            )
          }
          setSendingFor(null)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <Roster
        characters={characters}
        onClaim={(category) => setCreating(category)}
        onSend={(id) => setSendingFor(id)}
      />

      {characters.length > 0 && creating === null && (
        <button
          type="button"
          onClick={() => setCreating('')}
          className="landing-focus self-start text-sm text-foreground-soft underline underline-offset-4 hover:text-foreground"
        >
          {content.existing.newCharacter}
        </button>
      )}

      {creating !== null && (
        <section
          aria-labelledby="new-character"
          className="landing-card flex w-full max-w-3xl flex-col gap-4 rounded-md border border-white/10 px-5 py-6 sm:px-6"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 id="new-character" className="font-display text-lg font-medium text-foreground">
              {content.roster.formHeading}
            </h2>
            {characters.length > 0 && (
              <button
                type="button"
                onClick={() => setCreating(null)}
                className="landing-focus text-sm text-foreground-soft underline underline-offset-4 hover:text-foreground"
              >
                {content.roster.cancel}
              </button>
            )}
          </div>
          <CharacterForm
            key={creating}
            archetypes={archetypes}
            initialCategory={creating}
            taken={characters.map((item) => item.category)}
            onCreated={(character) => {
              setCharacters((current) => [
                ...current.filter((item) => item.category !== character.category),
                character,
              ])
              setCreating(null)
              setSendingFor(character.id)
            }}
          />
        </section>
      )}
    </div>
  )
}
